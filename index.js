import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Papa from 'papaparse';

const TIMESHEET_DIR = './timesheets';
const FY_START = new Date(Date.UTC(2025, 6, 1));   // July is month 6 (0-indexed). Yes, really.
const FY_END = new Date(Date.UTC(2026, 1, 6));     // February 6, 2026.
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROW_REGEX = /(?<=Mon |Tue |Wed |Thu |Fri )(\d+)\s+(\w{3})\s+(\d[.]00|[(][^)]+)/gm;

function formatDateKey(date) {
    return date.toISOString().slice(0, 10).split('-').reverse().join('/');
}

function buildLeaveCalendar(start, end) {
    const rows = {};
    for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const weekday = d.getUTCDay();
        if (weekday >= 1 && weekday <= 5) {
            const key = formatDateKey(d);
            rows[key] = { Date: key, Hours: '0.0', Notes: 'Leave' };
        }
    }
    return rows;
}

function fyYear(monthIndex, fyStartMonth, fyStartYear) {
    return monthIndex < fyStartMonth ? fyStartYear + 1 : fyStartYear;
}

function applyPdf(rows, pdfPath, fyStartMonth, fyStartYear) {
    const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8' });
    for (const match of text.matchAll(ROW_REGEX)) {
        const [, dd, mmm, value] = match;
        const monthIndex = MONTHS.indexOf(mmm);
        if (monthIndex === -1) continue;
        const year = fyYear(monthIndex, fyStartMonth, fyStartYear);
        const dateKey = [dd, String(monthIndex)].map((x) => x.padStart(2, '0')).concat(String(year)).join('/');
        const row = rows[dateKey];
        if (row === undefined) continue;
        if (value.startsWith('(')) {
            row.Notes = 'Public holiday - ' + value.slice(1, -1);
        } else {
            row.Hours = value;
            row.Notes = 'WFH';
        }
    }
}

function main() {
    const rows = buildLeaveCalendar(FY_START, FY_END);
    const fyStartMonth = FY_START.getUTCMonth() + 1;
    const fyStartYear = FY_START.getUTCFullYear();

    for (const file of readdirSync(TIMESHEET_DIR)) {
        if (!file.endsWith('.pdf')) continue;
        applyPdf(rows, path.join(TIMESHEET_DIR, file), fyStartMonth, fyStartYear);
    }

    const csv = Papa.unparse(Object.values(rows));
    writeFileSync(`output_${Date.now()}.csv`, csv, 'utf8');
}

main();
