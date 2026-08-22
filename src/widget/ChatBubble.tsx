import type { WidgetTheme } from './types'

interface ChatBubbleProps {
  open: boolean
  theme?: WidgetTheme
  onClick: () => void
}

export default function ChatBubble({ open, theme, onClick }: ChatBubbleProps) {
  const primary = theme?.primaryColor || '#2563eb'
  const radius = theme?.borderRadius || '50%'

  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Fechar chat' : 'Abrir chat'}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '56px',
        height: '56px',
        borderRadius: radius,
        background: primary,
        color: '#ffffff',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        transition: 'transform 0.2s ease',
        fontFamily: theme?.fontFamily || 'inherit',
      }}
    >
      {open ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
    </button>
  )
}
