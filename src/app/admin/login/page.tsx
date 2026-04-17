'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-md px-4">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="FaceAttend" className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B]">FaceAttend</h1>
          <p className="text-[#64748B] text-sm mt-1">Intelligent Attendance Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="h-1 bg-brand" />
          <div className="p-8">
            <h2 className="text-lg font-semibold text-[#1E293B] mb-1">Welcome back</h2>
            <p className="text-sm text-[#64748B] mb-6">Sign in to your admin account</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[#1E293B]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="h-11 border-[#E2E8F0] focus:border-brand focus:ring-brand"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[#1E293B]">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-[#E2E8F0] focus:border-brand focus:ring-brand"
                  required
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                className="w-full h-11 bg-brand hover:bg-brand-dark text-white font-medium"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-[#94A3B8] mt-6">
          Powered by FaceAttend
        </p>
      </div>
    </div>
  )
}
