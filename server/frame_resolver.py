import logging
import re
from dataclasses import dataclass
from pathlib import Path

from models import FrameMessage

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
CONTAINER_PREFIX = "data/content/dataset"
KEEP_PATTERN = re.compile(
    r"4k-time-lapse-car-parking-lot-stock-video-download-video-clip-now-istock_TyROSAGZ_mp4-(\d+)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class IndexedFrame:
    frame_id: int
    source_frame_id: str
    split: str
    path: Path


class FrameResolver:
    def __init__(self, dataset_path: Path):
        self.dataset_path = dataset_path.resolve()
        self._index: dict[str, Path] = {}
        self._build_index()

    def _build_index(self):
        if not self.dataset_path.exists():
            logger.warning("Dataset path not found: %s", self.dataset_path)
            return

        for split_dir in self._iter_split_dirs():
            images_dir = split_dir / "images"
            if not images_dir.exists():
                continue

            image_files = [
                image_file
                for image_file in sorted(images_dir.iterdir())
                if image_file.is_file() and image_file.suffix.lower() in IMAGE_EXTENSIONS
            ]
            raw_images = [
                image_file
                for image_file in image_files
                if self._extract_raw_frame_order(image_file) is not None
            ]

            if raw_images:
                for index, image_file in enumerate(
                    sorted(raw_images, key=self._extract_raw_frame_order), start=1
                ):
                    self._index[f"{index:04d}"] = image_file
                continue

            for image_file in image_files:
                self._index[image_file.stem] = image_file

        logger.info("Indexed %d frame images from %s", len(self._index), self.dataset_path)

    @property
    def indexed_frames(self) -> int:
        return len(self._index)

    def ordered_frames(self) -> list[IndexedFrame]:
        frames: list[IndexedFrame] = []
        for index, (source_frame_id, path) in enumerate(self._index.items(), start=1):
            frames.append(
                IndexedFrame(
                    frame_id=index,
                    source_frame_id=source_frame_id,
                    split=self._infer_split(path),
                    path=path,
                )
            )
        return frames

    def get_indexed_path(self, source_frame_id: str) -> Path | None:
        path = self._index.get(source_frame_id)
        if path and path.is_file():
            return path
        return None

    def _iter_split_dirs(self):
        images_dir = self.dataset_path / "images"
        if images_dir.exists():
            yield self.dataset_path
            return

        for split_dir in sorted(path for path in self.dataset_path.iterdir() if path.is_dir()):
            if (split_dir / "images").exists():
                yield split_dir

    @staticmethod
    def _extract_raw_frame_order(image_file: Path) -> int | None:
        match = KEEP_PATTERN.search(image_file.name)
        return int(match.group(1)) if match else None

    def _infer_split(self, image_path: Path) -> str:
        try:
            relative = image_path.resolve().relative_to(self.dataset_path)
        except Exception:
            return "dataset"

        if len(relative.parts) >= 3 and relative.parts[1] == "images":
            return relative.parts[0]
        if len(relative.parts) >= 2 and relative.parts[0] == "images":
            return "dataset"
        return "dataset"

    def resolve(self, message: FrameMessage) -> Path | None:
        candidates: list[Path] = []

        indexed = self._index.get(message.source_frame_id)
        if indexed:
            candidates.append(indexed)

        split_dir = self.dataset_path / message.split
        for ext in (".jpg", ".jpeg", ".png"):
            candidates.append(split_dir / "images" / f"{message.source_frame_id}{ext}")

        image_path = message.image.replace("\\", "/")
        if image_path.startswith(CONTAINER_PREFIX):
            relative = image_path[len(CONTAINER_PREFIX) :].lstrip("/")
            candidates.append(self.dataset_path / relative)

        candidates.append(Path(message.image))

        seen: set[Path] = set()
        for candidate in candidates:
            resolved = candidate.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            if resolved.is_file():
                return resolved

        logger.warning(
            "Frame image not found for source_frame_id=%s split=%s",
            message.source_frame_id,
            message.split,
        )
        return None

    def read_bytes(self, message: FrameMessage) -> bytes | None:
        path = self.resolve(message)
        if not path:
            return None
        return path.read_bytes()
