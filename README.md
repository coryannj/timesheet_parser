# timesheet_parser

Parses PDF timesheets, extracts hours worked from home, and saves the result as a `.csv` for an Australian tax return.

The repository currently contains two implementations of the same script:

- `timesheets.py` — Python, stdlib only
- `index.js` — Node.js, depends on [`papaparse`](https://www.npmjs.com/package/papaparse)

Both shell out to the [`pdftotext`](https://www.xpdfreader.com/pdftotext-man.html) command-line tool to extract the text layer of each PDF, then regex over the result. Only weekdays in the configured financial year appear in the output.

## Output format

A CSV with three columns:

| Column | Example | Meaning |
|---|---|---|
| `Date` | `07/02/2026` | `DD/MM/YYYY` |
| `Hours` | `8.0` | Hours worked from home, or `0.0` for leave/public holidays |
| `Notes` | `WFH` / `Leave` / `Public holiday - ...` | — |

## Requirements

- Python 3.9+ *or* Node.js 20+
- `pdftotext` on `PATH` — install via:
  - **macOS:** `brew install xpdf` or `brew install poppler`
  - **Linux:** `apt install poppler-utils` (Debian/Ubuntu) or `dnf install poppler-utils` (Fedora)
  - **Windows:** download from [xpdfreader.com](https://www.xpdfreader.com/download.html)

## Usage

1. Place PDF timesheets into `./timesheets/` (or edit `TIMESHEET_DIR` at the top of the script).
2. Edit `FY_START` / `FY_END` to match the dates you want to cover.
3. Run one:
   ```bash
   python timesheets.py
   # or
   npm install
   node index.js
   ```
4. A CSV is written to the current directory (`pyoutput<timestamp>.csv` or `output_<timestamp>.csv`).

## Assumptions about the input PDFs

The regex expects text roughly shaped like:

```
Mon 03 Feb     8.0
Tue 04 Feb     (Public holiday)
Wed 05 Feb     8.0
```

— three-letter month abbreviations in English, days prefixed with `Mon`/`Tue`/…/`Fri`, hours as a decimal, public holidays in parentheses. If your employer's timesheet PDF is laid out differently, the regex is the first thing you'll want to look at.

## Licence

ISC — see [LICENSE](LICENSE).
