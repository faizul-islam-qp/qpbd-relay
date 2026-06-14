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
type StaffMode = 'otp' | 'password'
type StaffStep = 'form' | 'otp' | 'set-password'

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('880')) return '+' + digits
  if (digits.startsWith('0')) return '+88' + digits
  return '+880' + digits
}

export default function Login() {
  const [panel, setPanel] = useState<Panel>('employee')
  const [empMode, setEmpMode] = useState<EmpMode>('login')
  const [staffMode, setStaffMode] = useState<StaffMode>('otp')
  const [staffStep, setStaffStep] = useState<StaffStep>('form')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailOtpStep, setEmailOtpStep] = useState(false)
  const [emailOtp, setEmailOtp] = useState('')
  const [emailOtpInfo, setEmailOtpInfo] = useState('')

  const [phone, setPhone] = useState('+880')
  const [otp, setOtp] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [otpInfo, setOtpInfo] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pendingToken, setPendingToken] = useState<{ user: any; access_token: string } | null>(null)

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

  const reset = () => { setError(''); setOtpInfo(''); setEmailOtpInfo('') }

  const telegramDeepLink = () => {
    if (!botInfo?.botUsername) return null
    const digits = phone.replace(/\D/g, '')
    return `https://t.me/${botInfo.botUsername}${digits.length >= 7 ? `?start=${digits}` : ''}`
  }

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      if (empMode === 'login') {
        const data = await authApi.login(email, password)
        setAuth(data.user, data.access_token)
        navigate(`/${data.user.role}`)
      } else {
        // Register step 1: send email OTP
        const res = await authApi.sendEmailOtp(email)
        setEmailOtpInfo(res.message + (res.debug_otp ? ` — dev code: ${res.debug_otp}` : ''))
        setEmailOtpStep(true)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed')
    } finally { setLoading(false) }
  }

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const data = await authApi.register(name, email, password, emailOtp)
      setAuth(data.user, data.access_token)
      navigate(`/${data.user.role}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid code')
    } finally { setLoading(false) }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const normalized = normalizePhone(phone)
      const res = await authApi.sendOtp(normalized)
      const info = res.message + (res.debug_otp ? ` — dev OTP: ${res.debug_otp}` : '')
      setOtpInfo(info)
      if (res.telegram_linked === false) {
        setError(res.message)
      } else {
        setOtpStep(true)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const normalized = normalizePhone(phone)
      const data = await authApi.verifyOtp(normalized, otp)
      if (data.needs_password) {
        setPendingToken({ user: data.user, access_token: data.access_token })
        setStaffStep('set-password')
        setOtpStep(false)
      } else {
        setAuth(data.user, data.access_token)
        navigate('/staff')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  const handleStaffPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setLoading(true)
    try {
      const normalized = normalizePhone(phone)
      const data = await authApi.staffPasswordLogin(normalized, staffPassword)
      setAuth(data.user, data.access_token)
      navigate('/staff')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); reset()
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      if (!pendingToken) return
      // Set auth first so the API call has the token
      setAuth(pendingToken.user, pendingToken.access_token)
      await authApi.setPassword(newPassword)
      navigate('/staff')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set password')
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
                onClick={() => { setPanel(p); setEmailOtpStep(false); setEmailOtp(''); setOtpStep(false); setStaffStep('form'); reset() }}
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
                      onClick={() => { setEmpMode(m); setEmailOtpStep(false); setEmailOtp(''); reset() }}
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

                {empMode === 'register' && emailOtpStep ? (
                  <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                    {emailOtpInfo && (
                      <div className="text-xs bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700">
                        {emailOtpInfo}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Verification Code</Label>
                      <Input
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="text-center text-xl tracking-[0.5em]"
                        required
                        autoFocus
                      />
                      <p className="text-xs text-gray-400 dark:text-zinc-500">Sent to {email}</p>
                    </div>
                    {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Verifying…' : 'Verify & Create Account'}
                    </Button>
                    <button
                      type="button"
                      className="w-full text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                      onClick={() => { setEmailOtpStep(false); setEmailOtp(''); reset() }}
                    >
                      ← Change details
                    </button>
                  </form>
                ) : (
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
                      {loading
                        ? 'Please wait…'
                        : empMode === 'login'
                          ? 'Login'
                          : 'Send Verification Code'}
                    </Button>
                    <p className="text-xs text-center text-gray-400 dark:text-zinc-500">Only @questionpro.com emails allowed</p>
                  </form>
                )}
              </>
            )}

            {/* ── Staff ── */}
            {panel === 'staff' && (
              <>
                {/* Set password after first OTP verify */}
                {staffStep === 'set-password' ? (
                  <form onSubmit={handleSetPassword} className="space-y-4">
                    <div className="rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-950/30 px-3 py-2.5 text-xs text-green-700 dark:text-green-300">
                      ✅ OTP verified! Set a password for quick login next time.
                    </div>
                    <div className="space-y-1.5">
                      <Label>New Password</Label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm Password</Label>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
                    </div>
                    {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Saving…' : 'Set Password & Continue'}
                    </Button>
                  </form>
                ) : (
                  <>
                    {/* OTP / Password toggle */}
                    <div className="flex gap-1 mb-5 bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg">
                      {(['otp', 'password'] as StaffMode[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => { setStaffMode(m); setOtpStep(false); setOtp(''); reset() }}
                          className={cn(
                            'flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                            staffMode === m
                              ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
                          )}
                        >
                          {m === 'otp' ? 'OTP Login' : 'Password Login'}
                        </button>
                      ))}
                    </div>

                    {/* Password login */}
                    {staffMode === 'password' && (
                      <form onSubmit={handleStaffPasswordLogin} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Phone Number</Label>
                          <Input value={phone} onChange={(e) => { setPhone(e.target.value); reset() }} placeholder="1XXXXXXXXX" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Password</Label>
                          <Input type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} required />
                        </div>
                        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? 'Logging in…' : 'Login'}
                        </Button>
                        <p className="text-xs text-center text-gray-400 dark:text-zinc-500">No password? Use OTP login first to set one.</p>
                      </form>
                    )}

                    {/* OTP login */}
                    {staffMode === 'otp' && !otpStep && (
                      <form onSubmit={handleSendOtp} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Phone Number</Label>
                          <Input value={phone} onChange={(e) => { setPhone(e.target.value); reset() }} placeholder="1XXXXXXXXX" required />
                        </div>

                        {botInfo?.botUsername && (
                          <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/30 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300 space-y-2">
                            <p className="font-medium">📲 First time? Link Telegram to receive OTPs</p>
                            <p className="text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                              Tap <strong>Open Bot</strong>, send your number — linked automatically.
                            </p>
                            {deepLink ? (
                              <a href={deepLink} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open Wick Office Bot
                              </a>
                            ) : (
                              <p className="text-gray-400 dark:text-zinc-500 italic">Enter phone above for your bot link.</p>
                            )}
                          </div>
                        )}

                        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-md">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? 'Sending…' : 'Send OTP via Telegram'}
                        </Button>
                      </form>
                    )}

                    {staffMode === 'otp' && otpStep && (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        {otpInfo && (
                          <div className="text-xs bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700">
                            {otpInfo}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label>6-digit OTP</Label>
                          <Input value={otp} onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456" maxLength={6}
                            className="text-center text-xl tracking-[0.5em]" required autoFocus />
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
