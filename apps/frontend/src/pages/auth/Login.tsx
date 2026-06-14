import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Moon, Sun, ExternalLink } from 'lucide-react'

type Panel = 'employee' | 'staff'
type EmpMode = 'login' | 'register'

export default function Login() {
  const [panel, setPanel] = useState<Panel>('employee')
  const [empMode, setEmpMode] = useState<EmpMode>('login')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [otpInfo, setOtpInfo] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { setAuth } = useAuthStore()
  const { dark, toggle, init } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => { init() }, [init])

  const { data: botInfo } = useQuery({
    queryKey: ['telegram-bot-info'],
    queryFn: authApi.getBotInfo,
    retry: false,
  })

  const reset = () => { setError(''); setOtpInfo('') }

  const telegramDeepLink = () => {
    if (!botInfo?.botUsername) return null
    const digits = phone.replace(/\D/g, '')
    return `https://t.me/${botInfo.botUsername}${digits ? `?start=${digits}` : ''}`
  }

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const data = empMode === 'login'
        ? await authApi.login(email, password)
        : await authApi.register(name, email, password)
      setAuth(data.user, data.access_token)
      navigate(`/${data.user.role}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const res = await authApi.sendOtp(phone)
      setOtpInfo(res.message + (res.debug_otp ? ` — dev OTP: ${res.debug_otp}` : ''))
      setOtpStep(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const data = await authApi.verifyOtp(phone, otp)
      setAuth(data.user, data.access_token)
      navigate('/staff')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  const deepLink = telegramDeepLink()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4 transition-colors">
      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white shadow-sm transition-colors"
        aria-label="Toggle dark mode"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">🏢</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wick Office</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Internal Request System</p>
        </div>

        <div className="bg-white dark:bg-zinc-800/80 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-xl overflow-hidden">
          {/* Role tabs */}
          <div className="flex border-b border-gray-200 dark:border-zinc-700">
            {(['employee', 'staff'] as Panel[]).map((p) => (
              <button
                key={p}
                onClick={() => { setPanel(p); reset() }}
                className={cn(
                  'flex-1 py-3 text-sm font-medium transition-colors',
                  panel === p
                    ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white -mb-px'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
                )}
              >
                {p === 'employee' ? '👔 Employee / Admin' : '🛠️ Staff'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── Employee / Admin ── */}
            {panel === 'employee' && (
              <>
                <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg">
                  {(['login', 'register'] as EmpMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setEmpMode(m); reset() }}
                      className={cn(
                        'flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                        empMode === m
                          ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                  {empMode === 'register' && (
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@questionpro.com" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Please wait…' : empMode === 'login' ? 'Login' : 'Create Account'}
                  </Button>
                  <p className="text-xs text-center text-gray-400 dark:text-zinc-500">Only @questionpro.com emails allowed</p>
                </form>
              </>
            )}

            {/* ── Staff OTP ── */}
            {panel === 'staff' && (
              <>
                {!otpStep ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); reset() }}
                        placeholder="+8801XXXXXXXXX"
                        required
                      />
                    </div>

                    {botInfo?.botUsername && (
                      <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/30 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300 space-y-2">
                        <p className="font-medium">📲 First time? Link Telegram to receive OTPs</p>
                        <p className="text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                          Tap <strong>Open Bot</strong>, press <strong>Start</strong> in Telegram — linked automatically.
                        </p>
                        {deepLink ? (
                          <a
                            href={deepLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open Wick Office Bot
                          </a>
                        ) : (
                          <p className="text-gray-400 dark:text-zinc-500 italic">Enter phone number above for your personal bot link.</p>
                        )}
                      </div>
                    )}

                    {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Sending…' : 'Send OTP via Telegram'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    {otpInfo && (
                      <div className="text-xs bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700">
                        {otpInfo}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>6-digit OTP</Label>
                      <Input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="text-center text-xl tracking-[0.5em]"
                        required
                      />
                    </div>
                    {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Verifying…' : 'Verify OTP'}
                    </Button>
                    <button type="button"
                      className="w-full text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                      onClick={() => { setOtpStep(false); setOtp(''); reset() }}>
                      ← Change number
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
