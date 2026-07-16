import asyncio
import json
import logging
import os
import threading
from typing import Callable

import paho.mqtt.client as mqtt
from pydantic import ValidationError

from frame_resolver import FrameResolver
from frame_state import FrameState
from models import FrameMessage, TelemetryBroadcast

logger = logging.getLogger(__name__)


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


class MqttBridge:
    def __init__(
        self,
        host: str,
        port: int,
        topic: str,
        frame_resolver: FrameResolver,
        frame_state: FrameState,
        on_telemetry: Callable[[TelemetryBroadcast], None] | None = None,
    ):
        self.host = host
        self.port = port
        self.topic = topic
        self.frame_resolver = frame_resolver
        self.frame_state = frame_state
        self.on_telemetry = on_telemetry
        self.connected = False
        self.auth_required = _env_flag("MQTT_REQUIRE_AUTH")
        self.username = os.environ.get("MQTT_USERNAME", "").strip()
        self.password = os.environ.get("MQTT_PASSWORD", "").strip()
        self.auth_configured = bool(self.username and self.password)
        self._client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        if self.auth_required and not self.auth_configured:
            raise RuntimeError(
                "MQTT_REQUIRE_AUTH=true but MQTT_USERNAME or MQTT_PASSWORD is missing"
            )
        if self.username:
            self._client.username_pw_set(self.username, self.password or None)
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message
        self._thread: threading.Thread | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    def start(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._thread = threading.Thread(target=self._run, name="mqtt-bridge", daemon=True)
        self._thread.start()

    def stop(self):
        self._client.loop_stop()
        self._client.disconnect()

    def _run(self):
        try:
            auth_mode = "required" if self.auth_required else "optional"
            username = self.username or "anonymous"
            logger.info(
                "MQTT connecting to %s:%s topic=%s auth=%s username=%s",
                self.host,
                self.port,
                self.topic,
                auth_mode,
                username,
            )
            self._client.connect(self.host, self.port, keepalive=60)
            self._client.loop_forever()
        except Exception:
            logger.exception("MQTT bridge stopped unexpectedly")

    def _on_connect(self, client, userdata, connect_flags, reason_code, properties):
        if reason_code == 0:
            self.connected = True
            result, mid = client.subscribe(self.topic, qos=1)
            logger.info(
                "MQTT connected to %s:%s topic=%s subscribe_result=%s mid=%s",
                self.host,
                self.port,
                self.topic,
                result,
                mid,
            )
        else:
            self.connected = False
            logger.error(
                "MQTT connect failed with reason code %s. Check MQTT_USERNAME/MQTT_PASSWORD and broker ACL for topic %s",
                reason_code,
                self.topic,
            )

    def _on_disconnect(self, client, userdata, disconnect_flags, reason_code, properties):
        self.connected = False
        logger.warning("MQTT disconnected: %s", reason_code)

    def _on_message(self, client, userdata, message):
        try:
            payload = json.loads(message.payload.decode("utf-8"))
            frame_message = FrameMessage.model_validate(payload)
        except (json.JSONDecodeError, ValidationError):
            logger.exception("Invalid MQTT payload")
            return

        image_bytes = self.frame_resolver.read_bytes(frame_message)
        if image_bytes:
            self.frame_state.update(
                frame_id=frame_message.frame_id,
                source_frame_id=frame_message.source_frame_id,
                split=frame_message.split,
                image_bytes=image_bytes,
                payload=frame_message.payload,
            )
        else:
            # Camera stream mode: MJPEG supplies images; MQTT supplies slot telemetry.
            self.frame_state.update_payload(
                frame_id=frame_message.frame_id,
                source_frame_id=frame_message.source_frame_id,
                split=frame_message.split,
                payload=frame_message.payload,
            )

        telemetry = TelemetryBroadcast(
            frame_id=frame_message.frame_id,
            source_frame_id=frame_message.source_frame_id,
            split=frame_message.split,
            payload=frame_message.payload,
        )

        if self.on_telemetry and self._loop:
            asyncio.run_coroutine_threadsafe(self._dispatch_telemetry(telemetry), self._loop)

    async def _dispatch_telemetry(self, telemetry: TelemetryBroadcast):
        if not self.on_telemetry:
            return
        result = self.on_telemetry(telemetry)
        if asyncio.iscoroutine(result):
            await result
