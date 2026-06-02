'use client'
import { useState, useEffect, useCallback } from 'react'

type CrawlerType = 'github' | 'docs' | 'custom'
type PublishStatus = 'draft' | 'published'

interface SourceCrawler {
  id: number
  name: string
  type: CrawlerType
  url: string
  prompt: string
  interval_hours: number
  enabled: boolean
  publish_status: PublishStatus
  last_run_at: string | null
  next_run_at: string | null
  last_error: string | null
  created_at: string
  items_total: number
  items_done: number
}

interface CrawlerItem {
  id: number
  crawler_id: number
  item_key: string
  item_title: string | null
  post_id: number | null
  status: string
  error: string | null
  processed_at: string
}

interface Toast { type: 'success' | 'error'; msg: string }

const TYPE_LABELS: Record<CrawlerType, string> = {
  github: 'GitHub',
  docs: 'Documentação',
  custom: 'URL Customizada',
}

const TYPE_ICONS: Record<CrawlerType, string> = {
  github: '⚙️',
  docs: '📖',
  custom: '🔗',
}

const INTERVAL_OPTIONS = [
  { value: 1, label: '1 hora' },
  { value: 6, label: '6 horas' },
  { value: 12, label: '12 horas' },
  { value: 24, label: '24 horas' },
  { value: 48, label: '48 horas' },
  { value: 168, label: '1 semana' },
]

const EMPTY_FORM = {
  name: '',
  type: 'github' as CrawlerType,
  url: '',
  prompt: '',
  interval_hours: 24,
  enabled: true,
  publish_status: 'published' as PublishStatus,
}

const URL_HINTS: Record<CrawlerType, string> = {
  github: 'Termo de busca do GitHub (ex: "AI tools machine learning")',
  docs: 'URL base da documentação (ex: https://docs.anthropic.com)',
  custom: 'URL específica para raspar (ex: https://example.com/page)',
}

export default function FontesClient() {
  const [crawlers, setCrawlers] = useState<SourceCrawler[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<number | null>(null)
  const [selectedCrawler, setSelectedCrawler] = useState<SourceCrawler | null>(null)
  const [items, setItems] = useState<CrawlerItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchCrawlers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/source-crawlers')
      const data = await res.json() as { crawlers: SourceCrawler[] }
      setCrawlers(data.crawlers ?? [])
    } catch {
      showToast('error', 'Erro ao carregar fontes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCrawlers() }, [fetchCrawlers])

  const fetchItems = async (crawlerId: number) => {
    setLoadingItems(true)
    try {
      const res = await fetch(`/api/admin/source-crawlers/${crawlerId}/items`)
      const data = await res.json() as { items: CrawlerItem[] }
      setItems(data.items ?? [])
    } finally {
      setLoadingItems(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const openEdit = (c: SourceCrawler) => {
    setEditingId(c.id)
    setForm({
      name: c.name,
      type: c.type,
      url: c.url,
      prompt: c.prompt,
      interval_hours: c.interval_hours,
      enabled: c.enabled,
      publish_status: c.publish_status,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      showToast('error', 'Nome e URL são obrigatórios')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await fetch(`/api/admin/source-crawlers/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        showToast('success', 'Fonte atualizada')
      } else {
        await fetch('/api/admin/source-crawlers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        showToast('success', 'Fonte criada')
      }
      setShowModal(false)
      await fetchCrawlers()
    } catch {
      showToast('error', 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remover esta fonte?')) return
    await fetch(`/api/admin/source-crawlers/${id}`, { method: 'DELETE' })
    if (selectedCrawler?.id === id) setSelectedCrawler(null)
    await fetchCrawlers()
    showToast('success', 'Fonte removida')
  }

  const handleToggle = async (c: SourceCrawler) => {
    await fetch(`/api/admin/source-crawlers/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !c.enabled }),
    })
    await fetchCrawlers()
  }

  const handleRun = async (id: number) => {
    setRunningId(id)
    try {
      const res = await fetch(`/api/admin/source-crawlers/${id}`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; error?: string }
      if (data.ok) {
        showToast('success', 'Artigo gerado com sucesso!')
        await fetchCrawlers()
        if (selectedCrawler?.id === id) await fetchItems(id)
      } else {
        showToast('error', data.error ?? 'Erro ao executar')
      }
    } catch {
      showToast('error', 'Erro ao executar fonte')
    } finally {
      setRunningId(null)
    }
  }

  const selectCrawler = (c: SourceCrawler) => {
    setSelectedCrawler(c)
    fetchItems(c.id)
  }

  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--at-text-primary)' }}>Fontes de Conteúdo</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--at-text-muted)' }}>
            Agentes que buscam conteúdo externo e geram artigos automaticamente
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--at-brand)' }}
        >
          + Nova Fonte
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--at-text-muted)' }}>Carregando...</p>
          ) : crawlers.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed" style={{ borderColor: 'var(--at-border)', color: 'var(--at-text-muted)' }}>
              <p className="text-sm">Nenhuma fonte configurada ainda.</p>
              <button onClick={openCreate} className="mt-2 text-sm underline" style={{ color: 'var(--at-brand)' }}>Criar a primeira</button>
            </div>
          ) : crawlers.map((c) => (
            <div
              key={c.id}
              onClick={() => selectCrawler(c)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCrawler?.id === c.id ? 'ring-2' : ''}`}
              style={{
                background: 'var(--at-card-bg)',
                borderColor: selectedCrawler?.id === c.id ? 'var(--at-brand)' : 'var(--at-border)',
                '--tw-ring-color': 'var(--at-brand)',
              } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{TYPE_ICONS[c.type]}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--at-text-primary)' }}>{c.name}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--at-text-muted)' }}>{TYPE_LABELS[c.type]} · a cada {c.interval_hours}h</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(c) }}
                    className={`relative w-9 h-5 rounded-full transition-colors ${c.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${c.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRun(c.id) }}
                    disabled={runningId === c.id}
                    className="text-xs px-2 py-1 rounded-md font-medium transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--at-brand)', color: 'white' }}
                  >
                    {runningId === c.id ? '...' : '▶'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(c) }}
                    className="text-xs px-2 py-1 rounded-md"
                    style={{ background: 'var(--at-hover)', color: 'var(--at-text-secondary)' }}
                  >✏️</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}
                    className="text-xs px-2 py-1 rounded-md text-red-500"
                    style={{ background: 'var(--at-hover)' }}
                  >🗑️</button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--at-text-muted)' }}>
                <span>✅ {c.items_done} artigos</span>
                <span>Última: {fmtDate(c.last_run_at)}</span>
                <span>Próxima: {fmtDate(c.next_run_at)}</span>
              </div>

              {c.last_error && (
                <p className="mt-2 text-xs text-red-500 truncate">⚠️ {c.last_error}</p>
              )}
            </div>
          ))}
        </div>

        {selectedCrawler && (
          <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--at-card-bg)', borderColor: 'var(--at-border)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--at-text-primary)' }}>
              Histórico — {selectedCrawler.name}
            </h2>
            {loadingItems ? (
              <p className="text-xs" style={{ color: 'var(--at-text-muted)' }}>Carregando...</p>
            ) : items.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--at-text-muted)' }}>Nenhuma execução ainda.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="text-xs p-2 rounded-lg" style={{ background: 'var(--at-hover)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium ${item.status === 'done' ? 'text-green-600' : 'text-red-500'}`}>
                        {item.status === 'done' ? '✅' : '❌'} {item.item_title ?? item.item_key}
                      </span>
                      <span style={{ color: 'var(--at-text-muted)' }}>{fmtDate(item.processed_at)}</span>
                    </div>
                    {item.post_id && (
                      <a
                        href={`/admin/artigos/${item.post_id}`}
                        className="mt-1 block text-xs underline"
                        style={{ color: 'var(--at-brand)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Ver artigo #{item.post_id}
                      </a>
                    )}
                    {item.error && <p className="mt-1 text-red-400 truncate">{item.error}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl shadow-xl p-6 space-y-4" style={{ background: 'var(--at-card-bg)' }}>
            <h2 className="font-bold text-lg" style={{ color: 'var(--at-text-primary)' }}>
              {editingId ? 'Editar Fonte' : 'Nova Fonte'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--at-text-secondary)' }}>Nome</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm border"
                  style={{ background: 'var(--at-input-bg)', borderColor: 'var(--at-border)', color: 'var(--at-text-primary)' }}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: GitHub AI Repos"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--at-text-secondary)' }}>Tipo</label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-sm border"
                  style={{ background: 'var(--at-input-bg)', borderColor: 'var(--at-border)', color: 'var(--at-text-primary)' }}
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CrawlerType }))}
                >
                  {(Object.keys(TYPE_LABELS) as CrawlerType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_ICONS[t]} {TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--at-text-secondary)' }}>
                  {form.type === 'github' ? 'Termo de busca' : 'URL'}
                </label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm border"
                  style={{ background: 'var(--at-input-bg)', borderColor: 'var(--at-border)', color: 'var(--at-text-primary)' }}
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder={URL_HINTS[form.type]}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--at-text-muted)' }}>{URL_HINTS[form.type]}</p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--at-text-secondary)' }}>Prompt de direcionamento</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm border resize-none"
                  style={{ background: 'var(--at-input-bg)', borderColor: 'var(--at-border)', color: 'var(--at-text-primary)' }}
                  value={form.prompt}
                  onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                  placeholder="Ex: Prefira repositórios sobre IA generativa e LLMs que tenham mais de 1000 stars e sejam relevantes para desenvolvedores brasileiros."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--at-text-secondary)' }}>Intervalo</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm border"
                    style={{ background: 'var(--at-input-bg)', borderColor: 'var(--at-border)', color: 'var(--at-text-primary)' }}
                    value={form.interval_hours}
                    onChange={(e) => setForm((f) => ({ ...f, interval_hours: parseFloat(e.target.value) }))}
                  >
                    {INTERVAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--at-text-secondary)' }}>Publicar como</label>
                  <select
                    className="w-full rounded-lg px-3 py-2 text-sm border"
                    style={{ background: 'var(--at-input-bg)', borderColor: 'var(--at-border)', color: 'var(--at-text-primary)' }}
                    value={form.publish_status}
                    onChange={(e) => setForm((f) => ({ ...f, publish_status: e.target.value as PublishStatus }))}
                  >
                    <option value="published">Publicado</option>
                    <option value="draft">Rascunho</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--at-brand)' }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--at-hover)', color: 'var(--at-text-secondary)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
