import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Users, CheckSquare, BookOpen, Calendar, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'

const TODAY = new Date().toISOString().slice(0, 10)
const DAYS  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

export default function DashboardPage({ setPage }) {
  const { user, profile } = useAuth()
  const [stats,    setStats]    = useState({ students: 0, hadir: 0, alpa: 0, sakit: 0, izin: 0 })
  const [schedule, setSchedule] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: sts } = await supabase.from('students').select('id').eq('teacher_id', user.id)
      const ids = (sts || []).map(s => s.id)
      const counts = { students: ids.length, hadir: 0, alpa: 0, sakit: 0, izin: 0 }
      if (ids.length) {
        const { data: att } = await supabase.from('attendance')
          .select('status').eq('date', TODAY).in('student_id', ids)
        ;(att || []).forEach(a => { if (counts[a.status.toLowerCase()] !== undefined) counts[a.status.toLowerCase()]++ })
      }
      setStats(counts)
      const dayOfWeek = new Date().getDay()
      const { data: sch } = await supabase.from('schedules')
        .select('*').eq('teacher_id', user.id).eq('day_of_week', dayOfWeek).order('start_time')
      setSchedule(sch || [])
      setLoading(false)
    }
    load()
  }, [user])

  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam'

  const QUICK = [
    { label: 'Input Absensi',  icon: CheckSquare, page: 'attendance', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' },
    { label: 'Input Nilai',    icon: BookOpen,    page: 'grades',     color: 'bg-brand-50 text-brand-700 hover:bg-brand-100 border-brand-200' },
    { label: 'Jurnal Sikap',   icon: CheckCircle, page: 'behavior',   color: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-200' },
    { label: 'Cetak Dokumen',  icon: Calendar,    page: 'print',      color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200' },
  ]

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* Header */}
      <div className="card p-6 bg-gradient-to-r from-brand-600 to-brand-700 border-0 text-white">
        <p className="text-brand-200 text-sm font-medium">{greeting},</p>
        <h1 className="font-display text-2xl font-bold mt-0.5">{profile?.full_name || 'Guru'}</h1>
        <p className="text-brand-200 text-sm mt-1">{profile?.school_name || ''} · {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Siswa',  value: stats.students, icon: Users,       color: 'bg-brand-50 text-brand-600' },
          { label: 'Hadir Hari Ini', value: stats.hadir,  icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Alpa',         value: stats.alpa,     icon: XCircle,     color: 'bg-rose-50 text-rose-600' },
          { label: 'Sakit/Izin',   value: stats.sakit + stats.izin, icon: Clock, color: 'bg-amber-50 text-amber-600' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${s.color}`}><Icon size={18} /></div>
              <div>
                <div className="font-display text-2xl font-bold text-slate-800">{loading ? '—' : s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Quick actions */}
        <div className="card p-5">
          <h2 className="font-display font-bold text-slate-800 mb-3">Aksi Cepat</h2>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map(q => {
              const Icon = q.icon
              return (
                <button key={q.page} onClick={() => setPage(q.page)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-colors text-left ${q.color}`}>
                  <Icon size={16} /> {q.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Today's schedule */}
        <div className="card p-5">
          <h2 className="font-display font-bold text-slate-800 mb-3">Jadwal Hari Ini <span className="text-slate-400 font-normal text-sm">({DAYS[new Date().getDay()]})</span></h2>
          {loading ? (
            <p className="text-slate-400 text-sm">Memuat...</p>
          ) : schedule.length === 0 ? (
            <p className="text-slate-400 text-sm">Tidak ada jadwal hari ini</p>
          ) : (
            <div className="space-y-2">
              {schedule.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                  <div className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg shrink-0 min-w-[80px] text-center">
                    {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{s.subject}</p>
                    <p className="text-xs text-slate-400">Kelas {s.class_name}{s.room ? ` · ${s.room}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {!loading && stats.students > 0 && (stats.hadir + stats.alpa + stats.sakit + stats.izin) > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-slate-800">Kehadiran Hari Ini</h2>
            <span className="text-xs text-slate-400">{stats.hadir + stats.alpa + stats.sakit + stats.izin}/{stats.students} tercatat</span>
          </div>
          <div className="flex rounded-xl overflow-hidden h-4">
            {[
              { key: 'hadir', color: 'bg-emerald-500' },
              { key: 'izin',  color: 'bg-sky-400' },
              { key: 'sakit', color: 'bg-amber-400' },
              { key: 'alpa',  color: 'bg-rose-500' },
            ].map(b => {
              const pct = stats.students > 0 ? (stats[b.key] / stats.students) * 100 : 0
              return pct > 0 ? <div key={b.key} className={`${b.color} transition-all`} style={{ width: pct + '%' }} /> : null
            })}
          </div>
          <div className="flex gap-4 mt-2 flex-wrap">
            {[['Hadir','emerald',stats.hadir],['Izin','sky',stats.izin],['Sakit','amber',stats.sakit],['Alpa','rose',stats.alpa]].map(([l,c,v]) => (
              <span key={l} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-2.5 h-2.5 rounded-full bg-${c}-500 inline-block`} />
                {l}: <strong>{v}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
