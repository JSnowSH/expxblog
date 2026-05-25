'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useState, useRef, useEffect } from 'react'

interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
}

export default function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const [linkPopover, setLinkPopover] = useState<{ visible: boolean; url: string }>({ visible: false, url: '' })
  const linkInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (linkPopover.visible) linkInputRef.current?.focus()
  }, [linkPopover.visible])

  if (!editor) return null

  const openLinkPopover = () => {
    const currentHref = editor.getAttributes('link').href ?? ''
    setLinkPopover({ visible: true, url: currentHref })
  }

  const applyLink = () => {
    const url = linkPopover.url.trim()
    if (!url) {
      editor.chain().focus().unsetLink().run()
    } else {
      const href = url.startsWith('http') ? url : `https://${url}`
      editor.chain().focus().setLink({ href, target: '_blank', rel: 'noopener noreferrer' }).run()
    }
    setLinkPopover({ visible: false, url: '' })
  }

  const removeLink = () => {
    editor.chain().focus().unsetLink().run()
    setLinkPopover({ visible: false, url: '' })
  }

  const toolbarButtons = [
    { label: 'B', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Negrito' },
    { label: 'I', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Itálico' },
    { label: 'H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), title: 'Título 2' },
    { label: 'H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), title: 'Título 3' },
    { label: '•', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Lista' },
    { label: '1.', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: 'Lista numerada' },
    { label: '❝', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), title: 'Citação' },
  ]

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-primary">
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 bg-gray-50">
        {toolbarButtons.map(btn => (
          <button
            key={btn.title}
            type="button"
            onClick={btn.action}
            title={btn.title}
            className={`px-2.5 py-1 text-sm font-medium rounded transition-colors ${
              btn.active ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {btn.label}
          </button>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={openLinkPopover}
            title="Link"
            className={`px-2.5 py-1 text-sm font-medium rounded transition-colors ${
              editor.isActive('link') ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            🔗
          </button>

          {linkPopover.visible && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-2 flex gap-1 min-w-64">
              <input
                ref={linkInputRef}
                type="url"
                value={linkPopover.url}
                onChange={e => setLinkPopover(p => ({ ...p, url: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter') applyLink()
                  if (e.key === 'Escape') setLinkPopover({ visible: false, url: '' })
                }}
                placeholder="https://exemplo.com"
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <button
                type="button"
                onClick={applyLink}
                className="px-2 py-1 text-sm bg-brand-primary text-white rounded hover:opacity-90"
              >
                OK
              </button>
              {editor.isActive('link') && (
                <button
                  type="button"
                  onClick={removeLink}
                  className="px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  title="Remover link"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <EditorContent editor={editor} className="prose max-w-none p-4 min-h-48 focus:outline-none" />
    </div>
  )
}
