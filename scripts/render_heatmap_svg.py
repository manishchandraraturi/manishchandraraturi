from pathlib import Path
import json
from datetime import datetime


ROOT = Path(__file__).resolve().parent.parent

INPUT = ROOT / "data" / "contributions.json"
OUTPUT = ROOT / "contrib-heatmap.svg"

CELL = 12
GAP = 3

WEEKS = 53
DAYS = 7

LEFT = 35
TOP = 35

GRID_WIDTH = WEEKS * (CELL + GAP)
GRID_HEIGHT = DAYS * (CELL + GAP)

WIDTH = LEFT + GRID_WIDTH + 20
HEIGHT = TOP + GRID_HEIGHT + 85


PALETTE = [
    "#161b22",
    "#0e4429",
    "#006d32",
    "#26a641",
    "#39d353",
]


def load_data():

    if not INPUT.exists():
        raise FileNotFoundError(
            f"Missing:\n{INPUT}\n\n"
            "Run fetch_contributions.py first."
        )

    return json.loads(
        INPUT.read_text(
            encoding="utf-8"
        )
    )


def make_svg(data):

    days = data["days"]
    stats = data["stats"]

    lookup = {
        day["date"]: day
        for day in days
    }

    ordered = sorted(
        days,
        key=lambda x: x["date"]
    )

    if not ordered:
        raise RuntimeError(
            "No contribution data found."
        )

    # GitHub's calendar is approximately 53 weeks.
    # Find the first displayed Sunday.
    first_date = datetime.strptime(
        ordered[0]["date"],
        "%Y-%m-%d"
    ).date()

    # Move backwards to Sunday.
    first_date = first_date.replace(
        day=first_date.day
    )

    while first_date.weekday() != 6:
        from datetime import timedelta

        first_date -= timedelta(days=1)

    svg = []

    svg.append(
        f'''<svg
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
stroke-width="1"/>

<style>

.title {{
    font-family: monospace;
    font-size: 16px;
    font-weight: bold;
    fill: #f0f6fc;
}}

.month {{
    font-family: monospace;
    font-size: 10px;
    fill: #8b949e;
}}

.cell {{
    opacity: 0;
    animation: reveal 0.35s ease-out forwards;
}}

@keyframes reveal {{

    from {{
        opacity: 0;
        transform: translateY(-8px);
    }}

    to {{
        opacity: 1;
        transform: translateY(0);
    }}

}}

.footer {{
    font-family: monospace;
    font-size: 11px;
    fill: #8b949e;
}}

.legend {{
    font-family: monospace;
    font-size: 10px;
    fill: #8b949e;
}}

</style>

<text
class="title"
x="18"
y="22">
github.com/manishchandraraturi — contributions
</text>
'''
    )

    # ----------------------------
    # CONTRIBUTION CELLS
    # ----------------------------

    from datetime import timedelta

    for week in range(WEEKS):

        for weekday in range(DAYS):

            current_date = (
                first_date
                + timedelta(
                    weeks=week,
                    days=weekday
                )
            )

            date_string = (
                current_date.isoformat()
            )

            day = lookup.get(
                date_string
            )

            level = (
                day["level"]
                if day
                else 0
            )

            # Clamp to available palette.
            level = max(
                0,
                min(
                    level,
                    len(PALETTE) - 1
                )
            )

            x = (
                LEFT
                + week * (CELL + GAP)
            )

            y = (
                TOP
                + weekday * (CELL + GAP)
            )

            delay = (
                week * 0.025
                + weekday * 0.012
            )

            svg.append(
                f'''
<rect
class="cell"
x="{x}"
y="{y}"
width="{CELL}"
height="{CELL}"
rx="3"
fill="{PALETTE[level]}"
style="animation-delay:{delay:.3f}s">
<title>
{date_string}: {day["count"] if day else 0} contributions
</title>
</rect>
'''
            )

    # ----------------------------
    # LEGEND
    # ----------------------------

    legend_y = TOP + GRID_HEIGHT + 18

    svg.append(
        f'''
<text
class="legend"
x="18"
y="{legend_y}">
Less
</text>
'''
    )

    for i, color in enumerate(PALETTE):

        x = 50 + i * 17

        svg.append(
            f'''
<rect
x="{x}"
y="{legend_y - 9}"
width="11"
height="11"
rx="2"
fill="{color}"/>
'''
        )

    svg.append(
        f'''
<text
class="legend"
x="142"
y="{legend_y}">
More
</text>
'''
    )

    # ----------------------------
    # STATS
    # ----------------------------

    footer_y = legend_y + 25

    total = stats.get(
        "total",
        0
    )

    current = stats.get(
        "current_streak",
        0
    )

    longest = stats.get(
        "longest_streak",
        0
    )

    svg.append(
        f'''
<text
class="footer"
x="18"
y="{footer_y}">
{total:,} contributions ·
current streak {current} days ·
longest streak {longest} days
</text>
'''
    )

    svg.append(
        "</svg>"
    )

    return "".join(svg)


def main():

    print("Loading contribution data...")

    data = load_data()

    print(
        f"Rendering "
        f"{len(data['days'])} contribution days..."
    )

    svg = make_svg(data)

    OUTPUT.write_text(
        svg,
        encoding="utf-8"
    )

    print()
    print("==============================")
    print("HEATMAP CREATED")
    print("==============================")
    print(f"Output: {OUTPUT}")
    print("==============================")


if __name__ == "__main__":
    main()