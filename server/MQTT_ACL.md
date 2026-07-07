# MQTT ACL cho parking-bridge

`parking-bridge` trong `parking-car/server` là client **chỉ subscribe** topic `parking/frames` để nhận frame/slot telemetry từ broker Mosquitto.

## Broker bên `20252B-digital-twin`

File broker hiện đã bật ACL:

```conf
listener 1883
allow_anonymous false
password_file /mosquitto/config/passwords
acl_file /mosquitto/config/aclfile
```

Vì vậy `parking-bridge` phải gửi username/password khi connect MQTT.

## Cấu hình trong `parking-car/server/.env`

```env
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_TOPIC=parking/frames
MQTT_REQUIRE_AUTH=true
MQTT_USERNAME=parking_bridge
MQTT_PASSWORD=<password khớp broker>
```

Khi chạy bằng Docker Compose của `parking-car`, `MQTT_HOST` được override thành `host.docker.internal` để container bridge kết nối broker đang chạy trên host.

## ACL broker cần có cho user `parking_bridge`

User `parking_bridge` chỉ cần quyền đọc:

```conf
user parking_bridge
topic read parking/frames
```

Không cấp `topic write` cho user này vì bridge không publish dữ liệu.

## Cách nhận biết lỗi

- `/api/health` trả:
  - `mqtt_auth_required: true`
  - `mqtt_auth_configured: true`
  - `mqtt_connected: false`
- Log có dòng `MQTT connect failed ... Check MQTT_USERNAME/MQTT_PASSWORD and broker ACL`

Khi đó kiểm tra lại:

1. `MQTT_USERNAME` và `MQTT_PASSWORD` trong `server/.env`.
2. User có tồn tại trong `password_file` của broker không.
3. `acl_file` có `topic read parking/frames` cho user `parking_bridge` không.
4. `MQTT_TOPIC` có đúng với topic camera publish không.
