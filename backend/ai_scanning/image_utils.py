from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener


STANDARD_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
HEIC_IMAGE_TYPES = {"image/heic", "image/heif"}
SUPPORTED_IMAGE_TYPES = STANDARD_IMAGE_TYPES | HEIC_IMAGE_TYPES

register_heif_opener()


class ImageConversionError(ValueError):
    pass


def convert_heic_to_jpeg(image_bytes: bytes) -> bytes:
    """Convert iPhone HEIC/HEIF image bytes to JPEG bytes without saving the file."""
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image = ImageOps.exif_transpose(image)
            image = image.convert("RGB")

            output = BytesIO()
            image.save(output, format="JPEG", quality=90, optimize=True)
            return output.getvalue()
    except (OSError, UnidentifiedImageError, ValueError) as exc:
        raise ImageConversionError("HEIC/HEIF image could not be converted to JPEG") from exc
