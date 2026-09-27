from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parent.parent

INPUT = ROOT / "source-photo.jpg"
OUTPUT = ROOT / "avi-ascii.svg"

# Dense -> sparse
RAMP = "@%#*+=-:. "

COLS = 70
ROWS = 65

CHAR_WIDTH = 8
CHAR_HEIGHT = 10

WIDTH = COLS * CHAR_WIDTH
HEIGHT = ROWS * CHAR_HEIGHT

TEXT_COLOR = "#c9d1d9"
BACKGROUND = "#0d1117"


def escape_xml(text):
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def brightness_to_char(value):
    index = int(
        (float(value) / 255.0)
        * (len(RAMP) - 1)
    )

    index = max(
        0,
        min(index, len(RAMP) - 1)
    )

    return RAMP[index]


def detect_face(image):
    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    cascade_path = (
        cv2.data.haarcascades
        + "haarcascade_frontalface_default.xml"
    )

    detector = cv2.CascadeClassifier(
        cascade_path
    )

    if detector.empty():
        raise RuntimeError(
            "OpenCV could not load the face detector."
        )

    faces = detector.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80),
    )

    if len(faces) == 0:
        raise RuntimeError(
            "No face detected."
        )

    # Use the largest detected face.
    return max(
        faces,
        key=lambda f: int(f[2]) * int(f[3])
    )


def crop_face(image, face):
    x, y, w, h = [int(v) for v in face]

    # Face + hair + a small amount of shoulders.
    left = int(x - w * 0.60)
    right = int(x + w * 1.60)

    top = int(y - h * 0.80)
    bottom = int(y + h * 1.70)

    left = max(0, left)
    top = max(0, top)

    right = min(
        image.shape[1],
        right
    )

    bottom = min(
        image.shape[0],
        bottom
    )

    return image[
        top:bottom,
        left:right
    ]


def make_grayscale(cropped):
    gray = cv2.cvtColor(
        cropped,
        cv2.COLOR_BGR2GRAY
    )

    # Local contrast.
    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8)
    )

    gray = clahe.apply(gray)

    return gray


def resize_for_ascii(gray):
    source_height, source_width = gray.shape

    target_width = COLS

    # Compensate for monospace characters being
    # taller than they are wide.
    target_height = int(
        target_width
        * source_height
        / source_width
        * (CHAR_WIDTH / CHAR_HEIGHT)
    )

    target_height = max(
        1,
        min(target_height, ROWS)
    )

    resized = cv2.resize(
        gray,
        (
            target_width,
            target_height
        ),
        interpolation=cv2.INTER_AREA
    )

    return resized


def create_ascii_canvas(resized):
    canvas = np.full(
        (ROWS, COLS),
        255,
        dtype=np.uint8
    )

    image_height, image_width = resized.shape

    x_offset = (
        COLS - image_width
    ) // 2

    y_offset = (
        ROWS - image_height
    ) // 2

    canvas[
        y_offset:
        y_offset + image_height,
        x_offset:
        x_offset + image_width
    ] = resized

    return canvas


def image_to_ascii(canvas):
    rows = []

    for y in range(ROWS):

        row = []

        for x in range(COLS):

            value = int(
                canvas[y, x]
            )

            row.append(
                brightness_to_char(value)
            )

        rows.append(
            "".join(row)
        )

    return rows


def build_svg(rows):
    svg = []

    svg.append(
        f'''<svg
xmlns="http://www.w3.org/2000/svg"
xml:space="preserve"
width="{WIDTH}"
height="{HEIGHT}"
viewBox="0 0 {WIDTH} {HEIGHT}">

<rect
width="100%"
height="100%"
fill="{BACKGROUND}"/>

<style>

.ascii {{
    font-family: "Courier New", monospace;
    font-size: 10px;
    font-weight: 600;
    fill: {TEXT_COLOR};
    white-space: pre;
}}

.row {{
    opacity: 0;
    animation:
        appear 0.18s ease-out forwards;
}}

@keyframes appear {{

    from {{
        opacity: 0;
        transform: translateX(-10px);
    }}

    to {{
        opacity: 1;
        transform: translateX(0);
    }}

}}

</style>
'''
    )

    for y, row in enumerate(rows):

        delay = y * 0.035

        svg.append(
            f'''
<text
class="ascii row"
x="8"
y="{(y + 1) * CHAR_HEIGHT}"
style="animation-delay:{delay:.3f}s"
>{escape_xml(row)}</text>
'''
        )

    svg.append(
        "</svg>"
    )

    return "".join(svg)


def main():

    if not INPUT.exists():
        raise FileNotFoundError(
            f"Photo not found:\n{INPUT}"
        )

    print("Loading original photo...")

    image = cv2.imread(
        str(INPUT)
    )

    if image is None:
        raise RuntimeError(
            "Could not load source-photo.jpg"
        )

    print("Detecting face...")

    face = detect_face(image)

    print(
        f"Face detected: "
        f"x={face[0]}, "
        f"y={face[1]}, "
        f"w={face[2]}, "
        f"h={face[3]}"
    )

    print("Cropping around face...")

    cropped = crop_face(
        image,
        face
    )

    print(
        f"Crop size: "
        f"{cropped.shape[1]} x "
        f"{cropped.shape[0]}"
    )

    print("Processing grayscale...")

    gray = make_grayscale(
        cropped
    )

    print("Resizing for ASCII...")

    resized = resize_for_ascii(
        gray
    )

    print(
        f"ASCII image: "
        f"{resized.shape[1]} x "
        f"{resized.shape[0]}"
    )

    print("Creating canvas...")

    canvas = create_ascii_canvas(
        resized
    )

    print("Converting to ASCII...")

    rows = image_to_ascii(
        canvas
    )

    print("Generating animated SVG...")

    svg = build_svg(
        rows
    )

    OUTPUT.write_text(
        svg,
        encoding="utf-8"
    )

    print()
    print("================================")
    print("ASCII SVG CREATED")
    print("================================")
    print(f"Output: {OUTPUT}")
    print(f"Size:   {WIDTH} x {HEIGHT}")
    print("================================")


if __name__ == "__main__":
    main()