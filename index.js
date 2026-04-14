import { readdirSync,writeFileSync } from 'node:fs';
import path from "node:path"
import Papa from 'papaparse';
import { execSync } from 'node:child_process'
const folderPath = './timesheets';
const thisYear = {}
const s = new Date(Date.UTC(2025,6,1))
const e = new Date(Date.UTC(2026,1,6)) // Last day I worked this FY

while(s<=e){
    if([1,2,3,4,5].includes(s.getUTCDay())){
        let key = s.toISOString().slice(0,10).split('-').reverse().join('/')
        thisYear[key] = Object.fromEntries([["Date",key],["Hours","0.0"],["Notes",'Leave']])
    }
    s.setDate(s.getDate()+1)
}

readdirSync(folderPath).forEach((file)=>{
    if(file.slice(-3) === 'pdf'){
        let fullPath = path.join('/Users/coryannj/Downloads/timesheets/timesheets/',file)
        let fullText = execSync('pdftotext -layout "'+fullPath+'" -').toString()
        let workdays = fullText.matchAll(/(?<=Mon |Tue |Wed |Thu |Fri )(\d+)(?:\s+)(\w{3})(?:\s+)(\d[.]00|[(][^)]+){1}/gm)?.toArray().map((x)=>x.slice(1,4))|| []

        workdays.forEach(([dd,mmm,type])=>{
            const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
            let monthInd = months.indexOf(mmm)
            let dateKey = [dd,''+monthInd].map((x)=>x.padStart(2,'0')).concat(monthInd < 7 ? '2026' : '2025').join('/')

            if(thisYear[dateKey] !== undefined){
                if(type[0] !== '('){
                    thisYear[dateKey]['Hours'] = type.slice(0,3)
                    thisYear[dateKey]['Notes'] = "WFH"
                } else {
                    thisYear[dateKey]['Notes'] = "Public Holiday"+" "+type.slice(1,-1)
                }
            }
        })
    }
})

const csv = Papa.unparse(Object.values(thisYear))
writeFileSync(`output_${Date.now().toString()}.csv`, csv, 'utf8')