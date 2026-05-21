'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface Props {
  blogName: string
}

export function LoginForm({ blogName }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao fazer login')
        return
      }

      router.push('/admin')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const initials = blogName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="admin-login-bg">
      {/* Left decorative panel */}
      <div className="hidden lg:flex admin-login-panel w-[420px] flex-col justify-between p-12 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl admin-brand-badge flex items-center justify-center">
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
          <span className="text-white/80 text-sm font-semibold">{blogName}</span>
        </div>

        <div>
          <div className="space-y-6 mb-12">
            {[
              { icon: '✦', label: 'Gerencie artigos e conteúdo' },
              { icon: '✦', label: 'Acompanhe analytics em tempo real' },
              { icon: '✦', label: 'Configure aparência e integrações' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <span className="text-blue-400 text-xs">{item.icon}</span>
                <span className="text-white/50 text-sm">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.07] pt-8">
            <p className="text-white/25 text-xs">
              Área restrita. Somente usuários autorizados.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="admin-login-card w-full max-w-[400px] p-10">
          {/* Header */}
          <div className="mb-8">
            <div className="w-11 h-11 rounded-xl admin-brand-badge flex items-center justify-center mb-5 lg:hidden">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
            <h1 className="text-[22px] font-bold text-gray-900 mb-1">Bem-vindo de volta</h1>
            <p className="text-sm text-gray-500">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="admin-input"
                placeholder="admin@blog.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="admin-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="admin-btn-primary w-full justify-center py-2.5 text-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Entrando…
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
