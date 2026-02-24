import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import Papa from 'papaparse'
import { Users, Plus, Search, Upload, Trash2, Pencil, X, Download, CheckCircle, AlertCircle, Loader, Filter } from 'lucide-react'

const GENDERS  = { L: 'Laki-laki', P: 'Perempuan' }
const SAMPLE   = `nisn,name,class,gender\n1234567890,Budi Santoso,7A,L\n0987654321,Siti Rahayu,7A,P`

export default function StudentsPage() {
  const { user } = useAuth()
  const [students, setStudents]  = useState([])
  const [search,   setSearch]    = useState('')
  const [filter,   setFilter]    = useState('all')
  const [classes,  setClasses]   = useState([])
  const [loading,  setLoading]   = useState(true)
  const [modal,    setModal]     = useState(null)
  const [form,     setForm]      = useState({ name: '', nisn: '', class: '', gender: 'L' })
  const [saving,   setSaving]    = useState(false)
  const [csvStage, setCsvStage]  = useState('idle')
  const [csvValid, setCsvValid]  = useState([])
  const [csvInvalid,setCsvInvalid]=useState([])
  const [csvProg,  setCsvProg]   = useState(0)
  const [csvResult,setCsvResult] = useState({ inserted: 0, updated: 0, failed: 0 })
  const fileRef = useRef(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('students').select('*').eq('teacher_id', user.id).order('class').order('name')
    setStudents(data || [])
    setClasses([...new Set((data || []).map(s => s.class))].sort())
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || (s.nisn || '').includes(search)
    const matchClass  = filter === 'all' || s.class === filter
    return matchSearch && matchClass
  })

  const openAdd  = () => { setForm({ name: '', nisn: '', class: '', gender: 'L' }); setModal('add') }
  const openEdit = (s)  => { setForm({ id: s.id, name: s.name, nisn: s.nisn || '', class: s.class, gender: s.gender }); setModal('edit') }

  const handleSave = async () => {
    if (!form.name.trim() || !form.class.trim()) return alert('Nama dan kelas wajib diisi')
    setSaving(true)
    const payload = { teacher_id: user.id, name: form.name.trim(), nisn: form.nisn || null, class: form.class.trim(), gender: form.gender }
    if (modal === 'add') await supabase.from('students').insert(payload)
    else await supabase.from('students').update(payload).eq('id', form.id)
    setSaving(false); setModal(null); load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Hapus siswa ini?')) return
    await supabase.from('students').delete().eq('id', id)
    load()
  }

  const parseCSV = (file) => {
    setCsvStage('parsing')
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: ({ data }) => {
        const valid = [], invalid = []
        data.forEach((row, i) => {
          if (row.gender) row.gender = String(row.gender).trim().toUpperCase()
          const errs = []
          if (!row.name?.trim()) errs.push('nama kosong')
          if (!row.class?.trim()) errs.push('kelas kosong')
          if (row.gender && !['L','P'].includes(row.gender)) errs.push('gender harus L/P')
          if (errs.length) invalid.push({ ...row, _line: i + 2, _errs: errs })
          else valid.push(row)
        })
        setCsvValid(valid); setCsvInvalid(invalid); setCsvStage('preview')
      },
      error: () => setCsvStage('error'),
    })
  }

  const resetCSV = () => { setCsvStage('idle'); setCsvValid([]); setCsvInvalid([]); setCsvProg(0); setCsvResult({ inserted: 0, updated: 0, failed: 0 }); if (fileRef.current) fileRef.current.value = '' }

  const runImport = async () => {
    setCsvStage('importing')
    const { data: existing } = await supabase.from('students').select('id, nisn').eq('teacher_id', user.id)
    const nisnMap = {}
    ;(existing || []).forEach(s => { if (s.nisn) nisnMap[String(s.nisn).trim()] = s.id })

    const toInsert = [], toUpdate = []
    csvValid.forEach(r => {
      const nisn = r.nisn ? String(r.nisn).trim() : null
      const row  = { teacher_id: user.id, nisn, name: String(r.name).trim(), class: String(r.class).trim(), gender: r.gender }
      if (nisn && nisnMap[nisn]) toUpdate.push({ id: nisnMap[nisn], ...row })
      else toInsert.push(row)
    })

    let inserted = 0, updated = 0, failed = 0
    const BATCH = 50
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const { data, error } = await supabase.from('students').insert(toInsert.slice(i, i + BATCH)).select()
      if (!error) inserted += data?.length || 0; else failed++
      setCsvProg(Math.round(((i + BATCH) / Math.max(csvValid.length, 1)) * 70))
    }
    for (let i = 0; i < toUpdate.length; i++) {
      const { id, ...fields } = toUpdate[i]
      const { error } = await supabase.from('students').update(fields).eq('id', id)
      if (!error) updated++; else failed++
      setCsvProg(70 + Math.round(((i + 1) / Math.max(toUpdate.length, 1)) * 30))
    }
    setCsvResult({ inserted, updated, failed }); setCsvStage('done'); load()
  }

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-800">Data Siswa</h1>
          <p className="text-slate-500 text-sm">{students.length} siswa terdaftar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { resetCSV(); setModal('import') }} className="btn-secondary flex items-center gap-2 text-sm">
            <Upload size={14} /> Import CSV
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 py-1.5 text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau NISN..." />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-slate-400" />
          <select className="input w-auto text-sm py-1.5" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Semua Kelas</option>
            {classes.map(c => <option key={c} value={c}>Kelas {c}</option>)}
          </select>
        </div>
      </div>

      {/* Student grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader size={28} className="text-brand-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p>Tidak ada siswa{search ? ' yang cocok' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(s => (
            <div key={s.id} className="card p-4 flex items-center gap-3 group hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0
                ${s.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                {s.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 text-sm truncate">{s.name}</p>
                <p className="text-xs text-slate-400">Kelas {s.class} · {GENDERS[s.gender]}</p>
                {s.nisn && <p className="text-xs text-slate-300 font-mono">{s.nisn}</p>}
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-brand-50 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"><Pencil size={13} /></button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-slate-800">{modal === 'add' ? 'Tambah Siswa' : 'Edit Siswa'}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Nama Lengkap *</label>
                <input className="input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Nama siswa" />
              </div>
              <div>
                <label className="label">NISN</label>
                <input className="input" value={form.nisn} onChange={e => setForm(p => ({...p, nisn: e.target.value}))} placeholder="Nomor Induk Siswa Nasional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kelas *</label>
                  <input className="input" value={form.class} onChange={e => setForm(p => ({...p, class: e.target.value}))} placeholder="7A, 8B..." />
                </div>
                <div>
                  <label className="label">Gender *</label>
                  <select className="input" value={form.gender} onChange={e => setForm(p => ({...p, gender: e.target.value}))}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {modal === 'import' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-slate-800">Import Siswa dari CSV</h3>
              <button onClick={() => { setModal(null); resetCSV() }} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
            </div>

            {csvStage === 'idle' && (
              <>
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-xl p-10 text-center cursor-pointer transition-colors">
                  <Upload size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="font-semibold text-slate-600">Klik untuk pilih file CSV</p>
                  <p className="text-sm text-slate-400 mt-1">Format: nisn, name, class, gender</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) parseCSV(e.target.files[0]) }} />
                <button onClick={() => { const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(SAMPLE); a.download = 'template_siswa.csv'; a.click() }}
                  className="mt-3 flex items-center gap-2 text-sm text-brand-600 hover:underline">
                  <Download size={13} /> Download template CSV
                </button>
              </>
            )}

            {csvStage === 'parsing' && (
              <div className="text-center py-10"><Loader size={32} className="mx-auto text-brand-500 animate-spin mb-3" /><p>Memproses file...</p></div>
            )}

            {csvStage === 'preview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[['Total', csvValid.length + csvInvalid.length, 'text-slate-700 bg-slate-50'],['Valid', csvValid.length, 'text-emerald-700 bg-emerald-50'],['Invalid', csvInvalid.length, 'text-rose-700 bg-rose-50']].map(([l,v,c]) => (
                    <div key={l} className={`rounded-xl p-3 ${c}`}><div className="text-2xl font-bold">{v}</div><div className="text-xs">{l}</div></div>
                  ))}
                </div>
                {csvInvalid.length > 0 && (
                  <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 space-y-1 max-h-24 overflow-y-auto">
                    {csvInvalid.map((r,i) => <div key={i}>Baris {r._line}: {r.name || '?'} — {r._errs.join(', ')}</div>)}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={resetCSV} className="btn-secondary flex-1 flex items-center justify-center gap-1"><X size={14} /> Batal</button>
                  <button onClick={runImport} disabled={csvValid.length === 0} className="btn-primary flex-1 flex items-center justify-center gap-1">
                    <Upload size={14} /> Import {csvValid.length} Siswa
                  </button>
                </div>
              </div>
            )}

            {csvStage === 'importing' && (
              <div className="text-center py-8 space-y-3">
                <Loader size={36} className="mx-auto text-brand-500 animate-spin" />
                <p className="font-semibold text-slate-700">Mengimpor...</p>
                <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: csvProg + '%' }} /></div>
              </div>
            )}

            {csvStage === 'done' && (
              <div className="text-center py-8 space-y-3">
                <CheckCircle size={48} className="mx-auto text-emerald-500" />
                <p className="font-bold text-xl text-slate-800">Import Selesai!</p>
                <div className="flex justify-center gap-4">
                  <div className="text-center"><div className="text-2xl font-bold text-emerald-600">{csvResult.inserted}</div><div className="text-xs text-slate-400">Baru</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-brand-600">{csvResult.updated}</div><div className="text-xs text-slate-400">Diperbarui</div></div>
                  {csvResult.failed > 0 && <div className="text-center"><div className="text-2xl font-bold text-rose-500">{csvResult.failed}</div><div className="text-xs text-slate-400">Gagal</div></div>}
                </div>
                <button onClick={() => { setModal(null); resetCSV() }} className="btn-primary px-8">Tutup</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
