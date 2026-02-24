import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Heart, ThumbsUp, ThumbsDown, Plus, Trash2, Search, Loader, X } from 'lucide-react'

export default function BehaviorPage() {
  const { user } = useAuth()
  const [logs,     setLogs]     = useState([])
  const [students, setStudents] = useState([])
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState({ student_id: '', type: 'positive', description: '', date: new Date().toISOString().slice(0,10) })
  const [saving,   setSaving]   = useState(false)

  const load = async () => {
    if (!user) return
    setLoading(true)
    const { data: sts } = await supabase.from('students').select('id,name,class').eq('teacher_id', user.id).order('name')
    setStudents(sts||[])
    const ids = (sts||[]).map(s=>s.id)
    if (ids.length) {
      const { data } = await supabase.from('behavior_logs').select('*').in('student_id', ids).order('date', {ascending:false}).order('created_at', {ascending:false})
      const sMap = {}; (sts||[]).forEach(s=>{sMap[s.id]=s})
      setLogs((data||[]).map(l=>({...l, student:sMap[l.student_id]})))
    } else setLogs([])
    setLoading(false)
  }

  useEffect(()=>{load()},[user])

  const filtered = logs.filter(l => {
    const matchFilter = filter==='all' || l.type===filter
    const matchSearch = !search || l.student?.name?.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const handleSave = async () => {
    if (!form.student_id||!form.description.trim()) return alert('Pilih siswa dan isi deskripsi')
    setSaving(true)
    await supabase.from('behavior_logs').insert({ student_id:form.student_id, type:form.type, description:form.description.trim(), date:form.date })
    setSaving(false); setModal(false); setForm({student_id:'',type:'positive',description:'',date:new Date().toISOString().slice(0,10)}); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus catatan ini?')) return
    await supabase.from('behavior_logs').delete().eq('id', id)
    load()
  }

  const pos = logs.filter(l=>l.type==='positive').length
  const neg = logs.filter(l=>l.type==='negative').length

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-slate-800">Jurnal Sikap</h1><p className="text-slate-500 text-sm">Catatan perilaku dan sikap siswa</p></div>
        <button onClick={()=>setModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={14}/> Tambah Catatan</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[{label:'Total Catatan',value:logs.length,color:'text-slate-700',bg:'bg-slate-50',icon:Heart},
          {label:'Positif',value:pos,color:'text-emerald-600',bg:'bg-emerald-50',icon:ThumbsUp},
          {label:'Negatif',value:neg,color:'text-rose-600',bg:'bg-rose-50',icon:ThumbsDown}].map(s=>{
          const Icon=s.icon
          return <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.bg}`}><Icon size={18} className={s.color}/></div>
            <div><div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-slate-500">{s.label}</div></div>
          </div>
        })}
      </div>

      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-9 py-1.5 text-sm" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari siswa atau deskripsi..."/>
        </div>
        <div className="flex gap-1">
          {[['all','Semua','slate'],['positive','Positif','emerald'],['negative','Negatif','rose']].map(([v,l,c])=>(
            <button key={v} onClick={()=>setFilter(v)}
              className={`text-sm px-3 py-1.5 rounded-xl font-semibold transition-colors ${filter===v?`bg-${c}-100 text-${c}-700`:'text-slate-500 hover:bg-slate-100'}`}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader size={28} className="text-brand-500 animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-slate-400"><Heart size={40} className="mx-auto mb-3 opacity-30"/><p>Belum ada catatan{filter!=='all'?' untuk filter ini':''}</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => (
            <div key={l.id} className="card p-4 flex items-start gap-3 group hover:shadow-md transition-shadow">
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${l.type==='positive'?'bg-emerald-100':'bg-rose-100'}`}>
                {l.type==='positive' ? <ThumbsUp size={16} className="text-emerald-600"/> : <ThumbsDown size={16} className="text-rose-600"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800 text-sm">{l.student?.name||'Siswa'}</span>
                  <span className="text-xs text-slate-400">Kelas {l.student?.class}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${l.type==='positive'?'bg-emerald-50 text-emerald-700':'bg-rose-50 text-rose-700'}`}>
                    {l.type==='positive'?'Positif':'Negatif'}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1">{l.description}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(l.date+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
              </div>
              <button onClick={()=>handleDelete(l.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all shrink-0">
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-slate-800">Tambah Catatan Sikap</h3>
              <button onClick={()=>setModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Siswa</label>
                <select className="input" value={form.student_id} onChange={e=>setForm(p=>({...p,student_id:e.target.value}))}>
                  <option value="">Pilih siswa...</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.name} — Kelas {s.class}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Jenis</label>
                <div className="flex gap-2">
                  {[['positive','Positif','emerald'],['negative','Negatif','rose']].map(([v,l,c])=>(
                    <button key={v} type="button" onClick={()=>setForm(p=>({...p,type:v}))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors
                        ${form.type===v?`bg-${c}-50 text-${c}-700 border-${c}-300`:'border-slate-200 text-slate-500'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-[80px] resize-none" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Tuliskan catatan perilaku..."/>
              </div>
              <div>
                <label className="label">Tanggal</label>
                <input type="date" className="input" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
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
