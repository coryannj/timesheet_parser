import calendar
import csv
import datetime
import os
import re
from datetime import date
from subprocess import run


TIMESHEET_DIR = "/Users/coryannj/Downloads/timesheets/timesheets/"
ROW_REGEX = re.compile(
    r"(?<=Mon |Tue |Wed |Thu |Fri )(\d+)\s(\w{3})\s+([1-8][.]0|(?:[(])[^)]+)"
)
MONTH_INDEX = {name: i for i, name in enumerate(calendar.month_abbr) if name}

FY_START = datetime.date(2025, 7, 1)
FY_END = datetime.date(2026, 2, 7)  # Last day worked this FY


def daterange(start_date: date, end_date: date):
    days = int((end_date - start_date).days)
    for n in range(days):
        new_date = start_date + datetime.timedelta(n)
        if new_date.weekday() < 5:
            yield new_date


def fy_year(month_index: int, fy_start: date) -> int:
    return fy_start.year + 1 if month_index < fy_start.month else fy_start.year


def main() -> None:
    rows_by_date = {
        single_date.strftime("%d/%m/%Y"): {
            "Date": single_date.strftime("%d/%m/%Y"),
            "Hours": "0.0",
            "Notes": "Leave",
        }
        for single_date in daterange(FY_START, FY_END)
    }

    with os.scandir(TIMESHEET_DIR) as it:
        for entry in it:
            if not entry.name.lower().endswith(".pdf"):
                continue
            result = run(
                ["pdftotext", "-layout", entry.path, "-"],
                capture_output=True,
                text=True,
            )
            for match in re.finditer(ROW_REGEX, result.stdout):
                day = match.group(1).rjust(2, "0")
                month_index = MONTH_INDEX[match.group(2)]
                year = fy_year(month_index, FY_START)
                date_key = f"{day}/{month_index:02d}/{year}"
                row = rows_by_date.get(date_key)
                if row is None:
                    continue
                value = match.group(3)
                if value.startswith("("):
                    row["Notes"] = "Public holiday - " + value[1:]
                else:
                    row["Hours"] = value
                    row["Notes"] = "WFH"

    now = datetime.datetime.now()
    output_path = "pyoutput" + now.strftime("%d%m%Y%H%M%S") + ".csv"
    rows = list(rows_by_date.values())
    with open(output_path, "w", newline="") as output_file:
        writer = csv.DictWriter(output_file, rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
