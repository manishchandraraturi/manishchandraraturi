from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "info-card.svg"


WIDTH = 490
HEIGHT = 500


def main():

    svg = f'''<svg
xmlns="http://www.w3.org/2000/svg"
width="{WIDTH}"
height="{HEIGHT}"
viewBox="0 0 {WIDTH} {HEIGHT}">

<rect
width="100%"
height="100%"
rx="18"
fill="#0d1117"
stroke="#30363d"
stroke-width="2"/>

<style>

.title {{
    font-family: monospace;
    font-size: 22px;
    font-weight: bold;
    fill: #f0f6fc;
}}

.key {{
    font-family: monospace;
    font-size: 15px;
    font-weight: bold;
    fill: #8b949e;
}}

.value {{
    font-family: monospace;
    font-size: 15px;
    fill: #c9d1d9;
}}

.project {{
    font-family: monospace;
    font-size: 15px;
    fill: #58a6ff;
}}

.line {{
    stroke: #30363d;
    stroke-width: 1;
}}

.item {{
    opacity: 0;
    animation: show 0.45s ease-out forwards;
}}

@keyframes show {{
    from {{
        opacity: 0;
        transform: translateX(-12px);
    }}

    to {{
        opacity: 1;
        transform: translateX(0);
    }}
}}

</style>

<!-- Header -->

<text
class="title item"
x="28"
y="45"
style="animation-delay:0.1s">
manish@github
</text>

<line
class="line"
x1="28"
y1="62"
x2="462"
y2="62"/>


<!-- PROFILE -->

<text
class="key item"
x="28"
y="100"
style="animation-delay:0.2s">
NOW
</text>

<text
class="value item"
x="155"
y="100"
style="animation-delay:0.25s">
AIML Student
</text>


<text
class="key item"
x="28"
y="130"
style="animation-delay:0.3s">
FOCUS
</text>

<text
class="value item"
x="155"
y="130"
style="animation-delay:0.35s">
AI / ML / Systems
</text>


<text
class="key item"
x="28"
y="160"
style="animation-delay:0.4s">
STACK
</text>

<text
class="value item"
x="155"
y="160"
style="animation-delay:0.45s">
Python · Kotlin · TypeScript
</text>


<!-- PROJECTS -->

<text
class="key item"
x="28"
y="205"
style="animation-delay:0.5s">
BUILDING
</text>

<text
class="project item"
x="155"
y="205"
style="animation-delay:0.55s">
VahakVigil
</text>


<text
class="project item"
x="155"
y="235"
style="animation-delay:0.6s">
Voice RAG
</text>


<text
class="project item"
x="155"
y="265"
style="animation-delay:0.65s">
TriVera
</text>


<text
class="project item"
x="155"
y="295"
style="animation-delay:0.7s">
KaamProof
</text>


<!-- INTERESTS -->

<text
class="key item"
x="28"
y="340"
style="animation-delay:0.75s">
INTERESTS
</text>

<text
class="value item"
x="155"
y="340"
style="animation-delay:0.8s">
AI · Robotics · Defence
</text>


<text
class="key item"
x="28"
y="385"
style="animation-delay:0.85s">
STATUS
</text>

<text
class="value item"
x="155"
y="385"
style="animation-delay:0.9s">
Building things that matter.
</text>


<!-- FOOTER -->

<line
class="line"
x1="28"
y1="420"
x2="462"
y2="420"/>

<text
class="value item"
x="28"
y="455"
style="animation-delay:1s">
github.com/manishchandraraturi
</text>

</svg>
'''

    OUTPUT.write_text(
        svg,
        encoding="utf-8"
    )

    print()
    print("Info card created!")
    print(f"Output: {OUTPUT}")


if __name__ == "__main__":
    main()