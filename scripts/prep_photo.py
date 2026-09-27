from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import remove


ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / "source-photo.jpg"
OUTPUT = ROOT / "source-prepped.png"


def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Photo not found: {INPUT}")

    print("Removing background...")

    with open(INPUT, "rb") as f:
        input_data = f.read()

    output_data = remove(input_data)

    temp = ROOT / "source-nobg.png"
    temp.write_bytes(output_data)

    print("Improving contrast...")

    image = cv2.imread(str(temp), cv2.IMREAD_UNCHANGED)

    if image is None:
        raise RuntimeError("Could not read processed image.")

    # Handle transparency
    if image.shape[2] == 4:
        bgr = image[:, :, :3]
        alpha = image[:, :, 3]
    else:
        bgr = image
        alpha = np.full(
            (image.shape[0], image.shape[1]),
            255,
            dtype=np.uint8,
        )

    # Convert to grayscale
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # Increase local contrast
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    )

    gray = clahe.apply(gray)

    # White background
    white = np.full_like(gray, 255)

    # Composite subject onto white
    alpha_f = alpha.astype(np.float32) / 255.0

    result = (
        gray.astype(np.float32) * alpha_f
        + white.astype(np.float32) * (1 - alpha_f)
    ).astype(np.uint8)

    Image.fromarray(result).save(OUTPUT)

    # Remove temporary file
    temp.unlink(missing_ok=True)

    print()
    print(f"Done!")
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    main()