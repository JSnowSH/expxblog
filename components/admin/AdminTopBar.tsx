'use client'

import { useAdminTheme } from './AdminThemeProvider'

export function AdminTopBar() {
  const { theme, toggle } = useAdminTheme()
  const isDark = theme === 'dark'

  return (
    <div className="admin-topbar">
      <div className="flex-1" />
      <button
        onClick={toggle}
        aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        className="admin-theme-toggle"
        title={isDark ? 'Tema claro' : 'Tema escuro'}
      >
        <span className="admin-theme-track">
          <span className="admin-theme-thumb">
            {isDark ? (
              /* Moon */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              /* Sun */
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </span>
        </span>
        <span className="admin-theme-label">
          {isDark ? 'Escuro' : 'Claro'}
        </span>
      </button>
    </div>
  )
}
