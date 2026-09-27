from pathlib import Path
import json
import re
from datetime import datetime, timedelta, timezone

import requests
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parent.parent

USERNAME = "manishchandraraturi"

URL = (
    f"https://github.com/users/"
    f"{USERNAME}/contributions"
)

OUTPUT = ROOT / "data" / "contributions.json"


def fetch_page():

    print(
        f"Fetching GitHub contributions for "
        f"{USERNAME}..."
    )

    response = requests.get(
        URL,
        headers={
            "User-Agent": "Mozilla/5.0"
        },
        timeout=30,
    )

    response.raise_for_status()

    return response.text


def parse_contributions(html):

    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    days = []

    for cell in soup.select(
        "td.ContributionCalendar-day"
    ):

        date = cell.get("data-date")

        if not date:
            continue

        level = cell.get(
            "data-level",
            "0"
        )

        try:
            level = int(level)
        except ValueError:
            level = 0

        tooltip = cell.get(
            "aria-label",
            ""
        )

        match = re.search(
            r"(\d+)\s+contribution",
            tooltip
        )

        count = (
            int(match.group(1))
            if match
            else 0
        )

        days.append(
            {
                "date": date,
                "count": count,
                "level": level,
            }
        )

    return days


def calculate_stats(days):

    if not days:
        return {
            "total": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "best_day": None,
        }

    total = sum(
        day["count"]
        for day in days
    )

    # Sort chronologically.
    ordered = sorted(
        days,
        key=lambda x: x["date"]
    )

    # Best day.
    best = max(
        ordered,
        key=lambda x: x["count"]
    )

    # Longest streak.
    longest = 0
    current = 0

    previous_date = None

    for day in ordered:

        date = datetime.strptime(
            day["date"],
            "%Y-%m-%d"
        ).date()

        if day["count"] > 0:

            if (
                previous_date is not None
                and date
                == previous_date
                + timedelta(days=1)
            ):
                current += 1
            else:
                current = 1

            longest = max(
                longest,
                current
            )

            previous_date = date

        else:
            current = 0
            previous_date = date

    # Current streak.
    current_streak = 0

    today = datetime.now(
        timezone.utc
    ).date()

    contribution_dates = {
        datetime.strptime(
            day["date"],
            "%Y-%m-%d"
        ).date()
        for day in ordered
        if day["count"] > 0
    }

    check = today

    # GitHub's latest calendar can be a few days
    # behind depending on timezone.
    if check not in contribution_dates:
        check -= timedelta(days=1)

    while check in contribution_dates:

        current_streak += 1

        check -= timedelta(days=1)

    return {
        "total": total,
        "current_streak": current_streak,
        "longest_streak": longest,
        "best_day": {
            "date": best["date"],
            "count": best["count"],
        },
    }


def main():

    html = fetch_page()

    days = parse_contributions(
        html
    )

    if not days:
        raise RuntimeError(
            "No contribution cells found. "
            "GitHub's HTML structure may have changed."
        )

    stats = calculate_stats(
        days
    )

    output = {
        "username": USERNAME,
        "generated_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "days": days,
        "stats": stats,
    }

    OUTPUT.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    OUTPUT.write_text(
        json.dumps(
            output,
            indent=2
        ),
        encoding="utf-8"
    )

    print()
    print("==============================")
    print("CONTRIBUTIONS FETCHED")
    print("==============================")
    print(
        f"Days: {len(days)}"
    )
    print(
        f"Total: {stats['total']}"
    )
    print(
        f"Current streak: "
        f"{stats['current_streak']}"
    )
    print(
        f"Longest streak: "
        f"{stats['longest_streak']}"
    )
    print(
        f"Output: {OUTPUT}"
    )
    print("==============================")


if __name__ == "__main__":
    main()