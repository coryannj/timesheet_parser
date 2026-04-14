import datetime
import os
from subprocess import run
import re
import csv

def daterange(start_date: date, end_date: date):
    days = int((end_date - start_date).days)
    for n in range(days):
        newDate = start_date + datetime.timedelta(n)
        if newDate.weekday()<5:
            yield newDate

s = datetime.date(2025,7,1)
e = datetime.date(2026,2,7) # Last day I worked this FY

thisFY = [{"Date": single_date.strftime("%d/%m/%Y"),"Hours":"0.0","Notes":"Leave"} for single_date in daterange(s, e)]

tDir = "/Users/coryannj/Downloads/timesheets/timesheets/"
cPrefix = 'pdftotext -layout "'
cSuffix = '" -'
tRegex = re.compile("(?<=Mon |Tue |Wed |Thu |Fri )(\\d+)\\s(\\w{3})\\s+([1-8][.]0|(?:[(])[^)]+)")
months = ['_','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

def find(lst, value):
    for i, dic in enumerate(lst):
        if dic['Date'] == value:
            return i
    return -1

with os.scandir(tDir) as it:
    for entry in it:
        if entry.name.endswith('pdf'):
            data = run(cPrefix + entry.path + cSuffix, capture_output=True, shell=True, text=True)
            for m in re.finditer(tRegex,data.stdout):
                dd = m.group(1).rjust(2,'0')
                monthInd = months.index(m.group(2))
                year = '2026' if monthInd < 7 else '2025'
                dateKey = dd+'/'+str(monthInd).rjust(2,'0')+'/'+year
                listInd = find(thisFY,dateKey)
                if listInd >= 0:
                    if m.group(3)[0] != '(':
                        thisFY[listInd]['Hours'] = m.group(3)
                        thisFY[listInd]['Notes'] = 'WFH'
                    else:
                        thisFY[listInd]['Notes'] = 'Public holiday - '+m.group(3)[1:]

now = datetime.datetime.now()
keys = thisFY[0].keys()

with open('pyoutput'+now.strftime("%d%m%Y%H%M%S")+'.csv', 'w', newline='') as output_file:
    dict_writer = csv.DictWriter(output_file, keys)
    dict_writer.writeheader()
    dict_writer.writerows(thisFY)