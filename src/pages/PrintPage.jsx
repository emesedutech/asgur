import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Printer, FileText, CheckSquare, BookOpen, BarChart2, ChevronLeft, ChevronRight, Loader, Settings } from 'lucide-react'

const toISO    = d => d.toISOString().slice(0, 10)
const fmtDate  = d => new Date(d+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
const fmtShort = d => new Date(d+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short'})
const fmtMonth = m => new Date(m+'-01').toLocaleDateString('id-ID',{month:'long',year:'numeric'})
const STATUSES = ['Hadir','Izin','Sakit','Alpa']
const S_COLOR  = {Hadir:'#10b981',Izin:'#0ea5e9',Sakit:'#f59e0b',Alpa:'#f43f5e'}
const S_BADGE  = {Hadir:'badge-H',Izin:'badge-I',Sakit:'badge-S',Alpa:'badge-A'}

const PRINT_CSS = `@media print{body *{visibility:hidden}#print-area,#print-area *{visibility:visible}#print-area{position:fixed;inset:0;padding:24px;background:white}@page{margin:1.5cm;size:A4}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:5px 8px;font-size:11px}th{background:#f1f5f9!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.badge-H{background:#d1fae5!important;color:#065f46!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.badge-I{background:#e0f2fe!important;color:#0c4a6e!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.badge-S{background:#fef3c7!important;color:#78350f!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.badge-A{background:#ffe4e6!important;color:#9f1239!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}`

const GRADE_LABEL = v => { const n=Number(v); return n>=85?'A':n>=70?'B':n>=60?'C':'D' }

export default function PrintPage() {
  const { user, profile } = useAuth()
  const [docType,    setDocType]    = useState('attendance-input')
  const [students,   setStudents]   = useState([])
  const [classes,    setClasses]    = useState([])
  const [subjects,   setSubjects]   = useState([])
  const [kelas,      setKelas]      = useState('all')
  const [date,       setDate]       = useState(toISO(new Date()))
  const [month,      setMonth]      = useState(toISO(new Date()).slice(0,7))
  const [subject,    setSubject]    = useState('')
  const [asmtName,   setAsmtName]   = useState('')
  const [attData,    setAttData]    = useState({})
  const [gradeData,  setGradeData]  = useState({})
  const [rekapAtt,   setRekapAtt]   = useState([])
  const [rekapDates, setRekapDates] = useState([])
  const [rekapDetail,setRekapDetail]= useState({})
  const [rekapGrades,setRekapGrades]= useState([])
  const [rekapCols,  setRekapCols]  = useState([])
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    const style = document.createElement('style'); style.innerHTML = PRINT_CSS; document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('students').select('*').eq('teacher_id',user.id).order('class').order('name')
      .then(({data})=>{setStudents(data||[]);setClasses([...new Set((data||[]).map(s=>s.class))].sort())})
    supabase.from('subjects').select('name').eq('teacher_id',user.id).order('name')
      .then(({data,error})=>{
        if(!error&&data?.length) setSubjects(data.map(s=>s.name))
        else supabase.from('schedules').select('subject').eq('teacher_id',user.id)
          .then(({data:sd})=>setSubjects([...new Set((sd||[]).map(s=>s.subject))].sort()))
      })
  }, [user])

  const filtered = kelas==='all' ? students : students.filter(s=>s.class===kelas)
  const shiftDate = n => { const d=new Date(date); d.setDate(d.getDate()+n); setDate(toISO(d)) }

  const loadData = async () => {
    setLoading(true)
    const ids = filtered.map(s=>s.id)
    if (!ids.length) { setLoading(false); return }

    if (docType==='attendance-input') {
      const {data} = await supabase.from('attendance').select('student_id,status').eq('date',date).in('student_id',ids)
      const map={}; (data||[]).forEach(r=>{map[r.student_id]=r.status}); setAttData(map)
    }
    if (docType==='grade-input'&&subject) {
      const {data} = await supabase.from('grades').select('student_id,score,assessment_name').eq('subject',subject).eq('assessment_date',date).in('student_id',ids)
      const map={}; (data||[]).forEach(r=>{map[r.student_id]=r.score}); setGradeData(map)
      if (data?.[0]?.assessment_name&&!asmtName) setAsmtName(data[0].assessment_name)
    }
    if (docType==='attendance-recap') {
      const start=month+'-01'; const endD=new Date(month+'-01'); endD.setMonth(endD.getMonth()+1)
      const {data} = await supabase.from('attendance').select('student_id,date,status').in('student_id',ids).gte('date',start).lt('date',toISO(endD)).order('date')
      const rows=data||[]; const dates=[...new Set(rows.map(r=>r.date))].sort(); const detail={}
      rows.forEach(r=>{if(!detail[r.student_id])detail[r.student_id]={};detail[r.student_id][r.date]=r.status})
      setRekapDates(dates); setRekapDetail(detail)
      setRekapAtt(filtered.map(s=>{const vals=Object.values(detail[s.id]||{});return{student:s,hadir:vals.filter(v=>v==='Hadir').length,izin:vals.filter(v=>v==='Izin').length,sakit:vals.filter(v=>v==='Sakit').length,alpa:vals.filter(v=>v==='Alpa').length,total:vals.length}}))
    }
    if (docType==='grade-recap'&&subject) {
      const {data} = await supabase.from('grades').select('student_id,assessment_date,assessment_name,score').eq('subject',subject).in('student_id',ids).order('assessment_date')
      const rows=data||[]; const colMap=new Map()
      rows.forEach(r=>{const k=r.assessment_date+'||'+(r.assessment_name||'');if(!colMap.has(k))colMap.set(k,{date:r.assessment_date,name:r.assessment_name||''})})
      const cols=[...colMap.values()]; setRekapCols(cols)
      const by={}; rows.forEach(r=>{if(!by[r.student_id])by[r.student_id]={};by[r.student_id][r.assessment_date+'||'+(r.assessment_name||'')]=r.score})
      setRekapGrades(filtered.map(s=>{const scores=Object.values(by[s.id]||{}).filter(v=>v!=null);return{student:s,cells:by[s.id]||{},avg:scores.length?scores.reduce((a,v)=>a+v,0)/scores.length:null}}))
    }
    setLoading(false)
  }

  useEffect(()=>{if(filtered.length)loadData()},[docType,date,month,subject,kelas,students])

  const school  = profile?.school_name||'Nama Sekolah'
  const teacher = profile?.full_name||'Nama Guru'

  const DOC_TYPES = [
    {id:'attendance-input', label:'Form Absensi',   icon:CheckSquare, color:'text-emerald-600 bg-emerald-50'},
    {id:'attendance-recap', label:'Rekap Absensi',  icon:BarChart2,   color:'text-sky-600 bg-sky-50'},
    {id:'grade-input',      label:'Form Nilai',     icon:BookOpen,    color:'text-violet-600 bg-violet-50'},
    {id:'grade-recap',      label:'Rekap Nilai',    icon:BarChart2,   color:'text-brand-600 bg-brand-50'},
  ]

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-slate-800">Cetak Dokumen</h1><p className="text-slate-500 text-sm">Form dan rekap siap cetak / PDF</p></div>
        <button onClick={()=>window.print()} className="btn-primary flex items-center gap-2 px-6 no-print"><Printer size={15}/> Cetak / PDF</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
        {DOC_TYPES.map(d=>{const Icon=d.icon;return(
          <button key={d.id} onClick={()=>setDocType(d.id)} className={`card p-4 text-left transition-all hover:shadow-md ${docType===d.id?'ring-2 ring-brand-400':''}`}>
            <div className={`inline-flex p-2 rounded-xl mb-2 ${d.color}`}><Icon size={16}/></div>
            <p className="text-sm font-semibold text-slate-700">{d.label}</p>
          </button>
        )})}
      </div>

      <div className="card p-4 no-print">
        <div className="flex items-center gap-2 mb-3"><Settings size={14} className="text-slate-400"/><span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filter</span></div>
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="label">Kelas</label>
            <select className="input w-auto" value={kelas} onChange={e=>setKelas(e.target.value)}>
              <option value="all">Semua Kelas</option>
              {classes.map(c=><option key={c} value={c}>Kelas {c}</option>)}
            </select>
          </div>
          {(docType==='attendance-input'||docType==='grade-input') && (
            <div><label className="label">Tanggal</label>
              <div className="flex items-center gap-0.5 bg-slate-50 rounded-xl px-1 py-1 border border-slate-100">
                <button onClick={()=>shiftDate(-1)} className="p-1.5 hover:bg-white rounded-lg"><ChevronLeft size={14} className="text-slate-500"/></button>
                <input type="date" className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none w-[130px]" value={date} onChange={e=>setDate(e.target.value)}/>
                <button onClick={()=>shiftDate(1)} className="p-1.5 hover:bg-white rounded-lg"><ChevronRight size={14} className="text-slate-500"/></button>
              </div>
            </div>
          )}
          {docType==='attendance-recap' && (
            <div><label className="label">Bulan</label><input type="month" className="input w-auto" value={month} onChange={e=>setMonth(e.target.value)}/></div>
          )}
          {(docType==='grade-input'||docType==='grade-recap') && (
            <>
              <div className="flex-1 min-w-[140px]"><label className="label">Mata Pelajaran</label>
                <input className="input" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Matematika..." list="p-subj"/>
                <datalist id="p-subj">{subjects.map(s=><option key={s} value={s}/>)}</datalist>
              </div>
              {docType==='grade-input' && (
                <div className="flex-1 min-w-[140px]"><label className="label">Nama Penilaian</label>
                  <input className="input" value={asmtName} onChange={e=>setAsmtName(e.target.value)} placeholder="Ulangan Harian 1..."/>
                </div>
              )}
            </>
          )}
          <button onClick={loadData} className="btn-secondary flex items-center gap-2">
            <Loader size={14} className={loading?'animate-spin':'opacity-0 w-0'}/>Muat Ulang
          </button>
        </div>
      </div>

      {/* PRINT AREA */}
      <div id="print-area" className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20 no-print"><Loader size={28} className="text-brand-500 animate-spin"/></div>
        ) : (
          <div className="p-6 md:p-8" style={{fontFamily:'Arial,sans-serif'}}>
            {/* Header */}
            <div style={{textAlign:'center',marginBottom:'24px',paddingBottom:'16px',borderBottom:'2px solid #e2e8f0'}}>
              <h2 style={{fontWeight:'bold',fontSize:'16px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                {docType==='attendance-input'&&'Daftar Hadir Siswa'}
                {docType==='attendance-recap'&&'Rekap Kehadiran Siswa'}
                {docType==='grade-input'&&'Daftar Nilai Siswa'}
                {docType==='grade-recap'&&'Rekap Nilai Siswa'}
              </h2>
              <p style={{color:'#475569',marginTop:'4px'}}>{school}</p>
              <div style={{display:'flex',justifyContent:'center',gap:'32px',marginTop:'12px',fontSize:'13px',color:'#475569',flexWrap:'wrap'}}>
                {kelas!=='all'&&<span><strong>Kelas:</strong> {kelas}</span>}
                {(docType==='attendance-input'||docType==='grade-input')&&<span><strong>Tanggal:</strong> {fmtDate(date)}</span>}
                {docType==='attendance-recap'&&<span><strong>Bulan:</strong> {fmtMonth(month)}</span>}
                {(docType==='grade-input'||docType==='grade-recap')&&subject&&<span><strong>Mapel:</strong> {subject}</span>}
                {docType==='grade-input'&&asmtName&&<span><strong>Penilaian:</strong> {asmtName}</span>}
                <span><strong>Guru:</strong> {teacher}</span>
              </div>
            </div>

            {/* attendance-input */}
            {docType==='attendance-input'&&(
              <table>
                <thead><tr>
                  <th style={{width:'36px',textAlign:'center'}}>No</th>
                  <th style={{width:'110px'}}>NISN</th>
                  <th>Nama Siswa</th>
                  <th style={{width:'50px',textAlign:'center'}}>Kelas</th>
                  <th style={{width:'55px',textAlign:'center',color:S_COLOR.Hadir}}>Hadir</th>
                  <th style={{width:'55px',textAlign:'center',color:S_COLOR.Izin}}>Izin</th>
                  <th style={{width:'55px',textAlign:'center',color:S_COLOR.Sakit}}>Sakit</th>
                  <th style={{width:'55px',textAlign:'center',color:S_COLOR.Alpa}}>Alpa</th>
                  <th>Catatan</th>
                </tr></thead>
                <tbody>
                  {filtered.map((s,i)=>{const st=attData[s.id];return(
                    <tr key={s.id}>
                      <td style={{textAlign:'center'}}>{i+1}</td>
                      <td style={{fontFamily:'monospace',fontSize:'10px'}}>{s.nisn||'—'}</td>
                      <td><strong>{s.name}</strong></td>
                      <td style={{textAlign:'center'}}>{s.class}</td>
                      {STATUSES.map(stat=><td key={stat} style={{textAlign:'center'}}>
                        {st===stat?<span className={S_BADGE[stat]} style={{padding:'2px 6px',borderRadius:'4px',fontSize:'11px',fontWeight:'bold'}}>✓</span>:<span style={{color:'#cbd5e1'}}>○</span>}
                      </td>)}
                      <td/>
                    </tr>
                  )})}
                </tbody>
                <tfoot><tr>
                  <td colSpan={4} style={{textAlign:'right',fontWeight:'bold',paddingRight:'8px'}}>Jumlah</td>
                  {STATUSES.map(st=><td key={st} style={{textAlign:'center',fontWeight:'bold'}}>{Object.values(attData).filter(v=>v===st).length||'—'}</td>)}
                  <td/>
                </tr></tfoot>
              </table>
            )}

            {/* grade-input */}
            {docType==='grade-input'&&(
              <table>
                <thead><tr>
                  <th style={{width:'36px',textAlign:'center'}}>No</th>
                  <th style={{width:'110px'}}>NISN</th>
                  <th>Nama Siswa</th>
                  <th style={{width:'50px',textAlign:'center'}}>Kelas</th>
                  <th style={{width:'70px',textAlign:'center'}}>Nilai</th>
                  <th>Catatan</th>
                  <th style={{width:'60px',textAlign:'center'}}>Paraf</th>
                </tr></thead>
                <tbody>
                  {filtered.map((s,i)=>{const score=gradeData[s.id];return(
                    <tr key={s.id}>
                      <td style={{textAlign:'center'}}>{i+1}</td>
                      <td style={{fontFamily:'monospace',fontSize:'10px'}}>{s.nisn||'—'}</td>
                      <td><strong>{s.name}</strong></td>
                      <td style={{textAlign:'center'}}>{s.class}</td>
                      <td style={{textAlign:'center',fontWeight:'bold',fontSize:'13px'}}>{score!=null?score:<span style={{color:'#e2e8f0'}}>___</span>}</td>
                      <td/>
                      <td/>
                    </tr>
                  )})}
                </tbody>
                <tfoot><tr>
                  <td colSpan={4} style={{textAlign:'right',fontWeight:'bold'}}>Rata-rata</td>
                  <td style={{textAlign:'center',fontWeight:'bold'}}>{(()=>{const s=Object.values(gradeData).filter(v=>v!=null);return s.length?(s.reduce((a,v)=>a+v,0)/s.length).toFixed(1):'—'})()}</td>
                  <td colSpan={2}/>
                </tr></tfoot>
              </table>
            )}

            {/* attendance-recap */}
            {docType==='attendance-recap'&&(
              <>
                <table style={{marginBottom:'20px'}}>
                  <thead><tr>
                    <th style={{width:'36px',textAlign:'center'}}>No</th>
                    <th>Nama Siswa</th>
                    <th style={{width:'50px',textAlign:'center'}}>Kelas</th>
                    <th style={{width:'50px',textAlign:'center',color:S_COLOR.Hadir}}>Hadir</th>
                    <th style={{width:'50px',textAlign:'center',color:S_COLOR.Izin}}>Izin</th>
                    <th style={{width:'50px',textAlign:'center',color:S_COLOR.Sakit}}>Sakit</th>
                    <th style={{width:'50px',textAlign:'center',color:S_COLOR.Alpa}}>Alpa</th>
                    <th style={{width:'50px',textAlign:'center'}}>Total</th>
                    <th style={{width:'60px',textAlign:'center'}}>% Hadir</th>
                  </tr></thead>
                  <tbody>
                    {rekapAtt.map((r,i)=>{const pct=r.total>0?Math.round(r.hadir/r.total*100):null;return(
                      <tr key={r.student.id}>
                        <td style={{textAlign:'center'}}>{i+1}</td>
                        <td><strong>{r.student.name}</strong></td>
                        <td style={{textAlign:'center'}}>{r.student.class}</td>
                        <td style={{textAlign:'center',fontWeight:'bold',color:S_COLOR.Hadir}}>{r.hadir||'—'}</td>
                        <td style={{textAlign:'center',fontWeight:'bold',color:S_COLOR.Izin}}>{r.izin||'—'}</td>
                        <td style={{textAlign:'center',fontWeight:'bold',color:S_COLOR.Sakit}}>{r.sakit||'—'}</td>
                        <td style={{textAlign:'center',fontWeight:'bold',color:S_COLOR.Alpa}}>{r.alpa||'—'}</td>
                        <td style={{textAlign:'center'}}>{r.total||'—'}</td>
                        <td style={{textAlign:'center',fontWeight:'bold'}}>{pct!=null?pct+'%':'—'}</td>
                      </tr>
                    )})}
                  </tbody>
                  <tfoot><tr>
                    <td colSpan={3} style={{textAlign:'right',fontWeight:'bold'}}>TOTAL</td>
                    {['hadir','izin','sakit','alpa','total'].map(k=><td key={k} style={{textAlign:'center',fontWeight:'bold'}}>{rekapAtt.reduce((a,r)=>a+r[k],0)}</td>)}
                    <td style={{textAlign:'center',fontWeight:'bold'}}>{(()=>{const h=rekapAtt.reduce((a,r)=>a+r.hadir,0);const t=rekapAtt.reduce((a,r)=>a+r.total,0);return t>0?Math.round(h/t*100)+'%':'—'})()}</td>
                  </tr></tfoot>
                </table>
                {rekapDates.length>0&&(
                  <>
                    <h3 style={{fontWeight:'bold',marginBottom:'8px',fontSize:'13px'}}>Detail Per Tanggal</h3>
                    <div style={{overflowX:'auto'}}>
                      <table style={{fontSize:'10px'}}>
                        <thead><tr>
                          <th style={{minWidth:'140px',textAlign:'left'}}>Nama Siswa</th>
                          {rekapDates.map(d=><th key={d} style={{minWidth:'32px',textAlign:'center',fontSize:'9px'}}>{fmtShort(d)}</th>)}
                        </tr></thead>
                        <tbody>
                          {rekapAtt.map(r=>(
                            <tr key={r.student.id}>
                              <td>{r.student.name}</td>
                              {rekapDates.map(d=>{const st=rekapDetail[r.student.id]?.[d];return(
                                <td key={d} style={{textAlign:'center'}}>
                                  <span className={st?S_BADGE[st]:''} style={{fontSize:'9px',fontWeight:'bold',padding:'1px 3px',borderRadius:'3px'}}>{st?st.charAt(0):'·'}</span>
                                </td>
                              )})}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p style={{marginTop:'8px',fontSize:'10px',color:'#64748b'}}>Keterangan: H=Hadir · I=Izin · S=Sakit · A=Alpa</p>
                  </>
                )}
              </>
            )}

            {/* grade-recap */}
            {docType==='grade-recap'&&(
              <div style={{overflowX:'auto'}}>
                <table>
                  <thead><tr>
                    <th style={{width:'36px',textAlign:'center'}}>No</th>
                    <th style={{minWidth:'150px'}}>Nama Siswa</th>
                    <th style={{width:'50px',textAlign:'center'}}>Kelas</th>
                    {rekapCols.map((c,i)=>(
                      <th key={i} style={{minWidth:'70px',textAlign:'center',fontSize:'10px'}}>
                        <div>{c.name||'Penilaian'}</div>
                        <div style={{fontWeight:'normal',color:'#64748b'}}>{new Date(c.date+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short'})}</div>
                      </th>
                    ))}
                    <th style={{width:'60px',textAlign:'center'}}>Rata-rata</th>
                    <th style={{width:'50px',textAlign:'center'}}>Grade</th>
                  </tr></thead>
                  <tbody>
                    {rekapGrades.map((r,i)=>(
                      <tr key={r.student.id}>
                        <td style={{textAlign:'center'}}>{i+1}</td>
                        <td><strong>{r.student.name}</strong></td>
                        <td style={{textAlign:'center'}}>{r.student.class}</td>
                        {rekapCols.map((c,ci)=>{const key=c.date+'||'+c.name;const val=r.cells[key];return(
                          <td key={ci} style={{textAlign:'center',fontWeight:val!=null?'bold':'normal',color:val!=null?val>=75?'#065f46':val>=60?'#92400e':'#9f1239':'#94a3b8'}}>
                            {val!=null?val:'—'}
                          </td>
                        )})}
                        <td style={{textAlign:'center',fontWeight:'bold'}}>{r.avg!==null?r.avg.toFixed(1):'—'}</td>
                        <td style={{textAlign:'center',fontWeight:'bold'}}>{r.avg!==null?GRADE_LABEL(r.avg):'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr>
                    <td colSpan={3} style={{textAlign:'right',fontWeight:'bold'}}>Rata-rata Kelas</td>
                    {rekapCols.map((c,i)=>{const key=c.date+'||'+c.name;const scores=rekapGrades.map(r=>r.cells[key]).filter(v=>v!=null);const avg=scores.length?scores.reduce((a,v)=>a+v,0)/scores.length:null;return(
                      <td key={i} style={{textAlign:'center',fontWeight:'bold'}}>{avg!==null?avg.toFixed(1):'—'}</td>
                    )})}
                    <td style={{textAlign:'center',fontWeight:'bold'}}>{(()=>{const avgs=rekapGrades.filter(r=>r.avg!==null).map(r=>r.avg);return avgs.length?(avgs.reduce((a,v)=>a+v,0)/avgs.length).toFixed(1):'—'})()}</td>
                    <td/>
                  </tr></tfoot>
                </table>
                <p style={{marginTop:'8px',fontSize:'10px',color:'#64748b'}}>Grade: A=≥85 · B=70-84 · C=60-69 · D=&lt;60</p>
              </div>
            )}

            {/* TTD */}
            <div style={{marginTop:'48px',display:'flex',justifyContent:'flex-end'}}>
              <div style={{textAlign:'center',minWidth:'180px'}}>
                <p style={{fontSize:'12px',color:'#475569'}}>{kelas!=='all'?`Wali Kelas ${kelas}`:'Guru Mata Pelajaran'}</p>
                <div style={{height:'60px'}}/>
                <div style={{borderTop:'1px solid #94a3b8',paddingTop:'4px'}}>
                  <p style={{fontWeight:'bold',fontSize:'12px'}}>{teacher}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-slate-400 no-print pb-4">
        Tekan <kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">Ctrl+P</kbd> atau klik tombol Cetak. Pilih "Save as PDF" untuk ekspor.
      </p>
    </div>
  )
}
