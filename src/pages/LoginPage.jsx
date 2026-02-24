import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { GraduationCap, Mail, Lock, Eye, EyeOff, User, School, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode,       setMode]       = useState('login')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [fullName,   setFullName]   = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const { error: err } = await signIn(email, password)
      if (err) setError(err.message)
    } else {
      if (!fullName.trim()) { setError('Nama lengkap wajib diisi'); setLoading(false); return }
      const { error: err } = await signUp(email, password, fullName, schoolName)
      if (err) setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Asisten Guru Pintar</h1>
          <p className="text-brand-200 mt-1">Kelola kelas dengan mudah</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            {['login','register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
                  ${mode === m ? 'bg-white shadow text-brand-700' : 'text-slate-500'}`}>
                {m === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 rounded-xl p-3 mb-4 text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="label">Nama Lengkap</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-10" value={fullName} onChange={e => setFullName(e.target.value)}
                      placeholder="Budi Santoso, S.Pd" />
                  </div>
                </div>
                <div>
                  <label className="label">Nama Sekolah</label>
                  <div className="relative">
                    <School size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-10" value={schoolName} onChange={e => setSchoolName(e.target.value)}
                      placeholder="SDN 01 Maju Bersama" />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" className="input pl-10" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="guru@sekolah.sch.id" required />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} className="input pl-10 pr-10"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 karakter" required minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-3 mt-2" disabled={loading}>
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
