import { readdirSync,writeFileSync,existsSync,mkdirSync } from 'node:fs';
import path from "node:path"
import { execFileSync } from 'node:child_process'
const inDir = './timesheets';
const outDir = './output';
const startYear = 2025
const s = new Date(Date.UTC(startYear,6,1))
const e = new Date(Date.UTC(startYear+1,1,6)) // Last day I worked this FY

const workingDays = (startDate,endDate) => {
    let 
        ms = 86400000,
        baseRow = {'Hours':'0.0','Notes':'Leave'},
        endMs = endDate.getTime(),
        rows = {}

    for(let d=startDate.getTime(); d<=endMs; d+=ms){
        let newDate = new Date(d)
        if(![1,2,3,4,5].includes(newDate.getDay())) continue;
        let timestamp = newDate.toLocaleDateString('en-GB')
        rows[timestamp] = {Date:timestamp, ...baseRow}
    }

    return rows
}

const parsePDFs = (timesheetDir,outputDir) => {
    const csvRows = workingDays(s,e)
    const months = Object.fromEntries(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((x,i)=>[x,`${i+1}`.padStart(2,'0')]))
    const rowRegex = /(?<=Mon |Tue |Wed |Thu |Fri )(\d+) (\w{3})(?=\s+\d|\s[(])\s+[(]?(\d[.]\d|[A-Z][^)]+)/g

    for (const file of readdirSync(timesheetDir)){
        if(!file.toLowerCase().endsWith('.pdf')) continue;
        
        let fullText = execFileSync('pdftotext', ['-layout', path.join(timesheetDir, file), '-'], { encoding: 'utf8' });

        let matches = fullText.matchAll(rowRegex)

        for (const match of matches){
            let [_,dd,mmm,type] = match
            let monthInd = months[mmm]
            let dateKey = `${dd.padStart(2,'0')}/${monthInd}/${+monthInd < 7 ? startYear+1 : startYear}`

            if(!csvRows[dateKey]) continue;

            if(type[1] === '.'){
                csvRows[dateKey]['Hours'] = type
                csvRows[dateKey]['Notes'] = "WFH"
            } else {
                csvRows[dateKey]['Notes'] = "Public Holiday - "+type
            }
        }    
    }

    const csv = ['Date,Hours,Notes'].concat(Object.values(csvRows).map((x)=>Object.values(x).join(','))).join('\n')

    if(!existsSync(outputDir)) mkdirSync(outputDir);

    writeFileSync(path.join(outputDir,`WFH_FY${startYear}-${startYear+1}_${Date.now().toString()}.csv`), csv, 'utf8')
}

parsePDFs(inDir,outDir)



