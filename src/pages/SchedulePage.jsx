import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Calendar, Plus, Trash2, X, Loader } from 'lucide-react'

const DAYS = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']
const DAY_COLORS = ['bg-sky-50 border-sky-200','bg-violet-50 border-violet-200','bg-emerald-50 border-emerald-200','bg-amber-50 border-amber-200','bg-brand-50 border-brand-200','bg-rose-50 border-rose-200','bg-slate-50 border-slate-200']
const DAY_TEXT   = ['text-sky-700','text-violet-700','text-emerald-700','text-amber-700','text-brand-700','text-rose-700','text-slate-700']

export default function SchedulePage() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [subjects,  setSubjects]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState({ day_of_week: 1, subject: '', class_name: '', room: '', start_time: '07:00', end_time: '08:00' })
  const [saving,    setSaving]    = useState(false)

  const load = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('schedules').select('*').eq('teacher_id', user.id).order('day_of_week').order('start_time')
    setSchedules(data||[])
    const { data: sd } = await supabase.from('subjects').select('name').eq('teacher_id', user.id).order('name')
    setSubjects((sd||[]).map(s=>s.name))
    setLoading(false)
  }

  useEffect(()=>{load()},[user])

  const handleSave = async () => {
    if (!form.subject.trim()||!form.class_name.trim()) return alert('Mapel dan kelas wajib diisi')
    setSaving(true)
    await supabase.from('schedules').insert({ teacher_id:user.id, ...form })
    setSaving(false); setModal(false); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus jadwal ini?')) return
    await supabase.from('schedules').delete().eq('id',id)
    load()
  }

  const byDay = DAYS.map((_,i) => schedules.filter(s=>s.day_of_week===i+1))

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-slate-800">Jadwal Mengajar</h1><p className="text-slate-500 text-sm">Jadwal pelajaran mingguan</p></div>
        <button onClick={()=>setModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={14}/> Tambah Jadwal</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader size={28} className="text-brand-500 animate-spin"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.map((day,i) => (
            <div key={day} className={`rounded-2xl border-2 p-4 ${DAY_COLORS[i]}`}>
              <h3 className={`font-display font-bold text-sm mb-3 ${DAY_TEXT[i]}`}>{day}</h3>
              {byDay[i].length === 0 ? (
                <p className="text-xs text-slate-400 italic">Tidak ada jadwal</p>
              ) : (
                <div className="space-y-2">
                  {byDay[i].map(s => (
                    <div key={s.id} className="bg-white rounded-xl p-3 group shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 text-sm leading-tight">{s.subject}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Kelas {s.class_name}{s.room?` · ${s.room}`:''}</p>
                          <p className={`text-xs font-semibold mt-1 ${DAY_TEXT[i]}`}>{s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}</p>
                        </div>
                        <button onClick={()=>handleDelete(s.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 text-slate-300 hover:text-rose-600 rounded-lg transition-all shrink-0 ml-1">
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-slate-800">Tambah Jadwal</h3>
              <button onClick={()=>setModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Hari</label>
                <select className="input" value={form.day_of_week} onChange={e=>setForm(p=>({...p,day_of_week:Number(e.target.value)}))}>
                  {DAYS.map((d,i)=><option key={d} value={i+1}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Mata Pelajaran</label>
                <input className="input" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))} placeholder="Matematika..." list="sch-subj"/>
                <datalist id="sch-subj">{subjects.map(s=><option key={s} value={s}/>)}</datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kelas</label>
                  <input className="input" value={form.class_name} onChange={e=>setForm(p=>({...p,class_name:e.target.value}))} placeholder="7A"/>
                </div>
                <div>
                  <label className="label">Ruangan</label>
                  <input className="input" value={form.room} onChange={e=>setForm(p=>({...p,room:e.target.value}))} placeholder="Lab IPA"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Mulai</label>
                  <input type="time" className="input" value={form.start_time} onChange={e=>setForm(p=>({...p,start_time:e.target.value}))}/>
                </div>
                <div>
                  <label className="label">Selesai</label>
                  <input type="time" className="input" value={form.end_time} onChange={e=>setForm(p=>({...p,end_time:e.target.value}))}/>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={()=>setModal(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving?'Menyimpan...':'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
