from datetime import date, datetime, timedelta
from subprocess import run
import os
import re
import calendar
import csv

START_YEAR = 2025
FY_START = date(START_YEAR, 7, 1)
FY_END = date(START_YEAR+1, 2, 6) # Last day I worked this FY
TIMESHEET_DIR = "./timesheets/"
OUTPUT_DIR = "./output/"
ROW_REGEX = re.compile("(?<=Mon |Tue |Wed |Thu |Fri )(\\d+)\\s(\\w{3})(?=\\s+\\d|\\s[(])\\s+[(]?(\\d[.]\\d|[A-Z][^)]+)")
MONTH_INDEX = {name: i for i, name in enumerate(calendar.month_abbr[1:], start = 1)}

def daterange(start_date: date, end_date: date):
    days = int((end_date - start_date).days) + 1
    for n in range(days):
        next_workday = start_date + timedelta(n)
        if next_workday.weekday() < 5:
            yield next_workday.strftime("%d/%m/%Y")

def main() -> None:
    csv_rows = {
        timestamp:{
            "Date": timestamp,
            "Hours": "0.0",
            "Notes": "Leave",
        }
        for timestamp in daterange(FY_START, FY_END)
    }

    with os.scandir(TIMESHEET_DIR) as folder:
        for file in folder:
            if not file.name.lower().endswith('.pdf'):
                continue

            data = run(
                ["pdftotext", "-layout", file.path, "-"],
                check=False,
                capture_output=True,
                text=True
            )

            for match in re.finditer(ROW_REGEX, data.stdout):
                dd = match.group(1).rjust(2,'0')
                month_ind = MONTH_INDEX[match.group(2)]
                year = str(START_YEAR+1) if month_ind < 7 else str(START_YEAR)
                date_key = dd+'/'+str(month_ind).rjust(2,'0')+'/'+year

                if not date_key in csv_rows:
                    continue

                if match.group(3)[1] == '.':
                    csv_rows[date_key]['Hours'] = match.group(3)
                    csv_rows[date_key]['Notes'] = 'WFH'
                else:
                    csv_rows[date_key]['Notes'] = 'Public Holiday - ' + match.group(3)

    if not os.path.isdir(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    now = datetime.now().strftime("%d%m%Y%H%M%S")

    with open(OUTPUT_DIR + 'pyoutput' + now + '.csv', 'w', newline='', encoding="utf-8") as output_file:
        dict_writer = csv.DictWriter(output_file, fieldnames = ['Date','Hours','Notes'])
        dict_writer.writeheader()
        dict_writer.writerows(list(csv_rows.values()))

main()
