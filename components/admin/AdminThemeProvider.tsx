'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type AdminTheme = 'dark' | 'light'

interface AdminThemeCtx {
  theme: AdminTheme
  toggle: () => void
}

const Ctx = createContext<AdminThemeCtx>({ theme: 'dark', toggle: () => {} })

export function useAdminTheme() {
  return useContext(Ctx)
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('admin-theme') as AdminTheme | null
    if (stored === 'light' || stored === 'dark') setTheme(stored)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const el = document.getElementById('admin-shell')
    if (!el) return
    el.setAttribute('data-admin-theme', theme)
    localStorage.setItem('admin-theme', theme)
  }, [theme, mounted])

  function toggle() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <Ctx.Provider value={{ theme, toggle }}>
      {/* default dark until JS hydrates */}
      <div id="admin-shell" data-admin-theme="dark" style={{ display: 'contents' }}>
        {children}
      </div>
    </Ctx.Provider>
  )
}
