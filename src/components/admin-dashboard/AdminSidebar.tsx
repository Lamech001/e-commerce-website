import { ArrowLeft, LogOut } from 'lucide-react'
import { ACCENT, ADMIN_NAV_ITEMS, DARK } from './constants'
import type { AdminSection } from './types'

interface AdminSidebarProps {
  section: AdminSection
  onSectionChange: (section: AdminSection) => void
  onViewChange: (view: string) => void
}

export default function AdminSidebar({
  section,
  onSectionChange,
  onViewChange,
}: AdminSidebarProps) {
  return (
    <aside
      className="dashboard-sidebar"
      style={{
        width: 248,
        background: DARK,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
      }}
    >
      <div className="dashboard-brand" style={{ padding: '22px 20px 16px' }}>
        <button
          onClick={() => onViewChange('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: 12.5,
            marginBottom: 22,
            padding: 0,
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} /> Back to Store
        </button>
        <div
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontWeight: 800,
            fontSize: 19,
            color: '#fff',
            letterSpacing: '-0.3px',
          }}
        >
          nelz<span style={{ color: '#60a5fa' }}>collections</span>
        </div>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#475569',
            background: '#1e293b',
            padding: '3px 9px',
            borderRadius: 4,
            display: 'inline-block',
            marginTop: 4,
          }}
        >
          Admin Panel
        </span>
      </div>

      <nav className="dashboard-nav" style={{ padding: '4px 12px', flex: 1 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: '#475569',
            padding: '0 8px',
            margin: '0 0 6px',
          }}
        >
          Management
        </p>
        {ADMIN_NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = section === item.id

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              aria-current={active ? 'page' : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                marginBottom: 2,
                textAlign: 'left',
                background: active ? ACCENT : 'transparent',
                color: active ? '#fff' : '#94a3b8',
                fontWeight: active ? 700 : 400,
                fontSize: 13.5,
                transition: 'all 0.15s',
              }}
              onMouseEnter={event => {
                if (!active) {
                  event.currentTarget.style.background = '#1e293b'
                  event.currentTarget.style.color = '#e2e8f0'
                }
              }}
              onMouseLeave={event => {
                if (!active) {
                  event.currentTarget.style.background = 'transparent'
                  event.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              <Icon size={15} /> {item.label}
            </button>
          )
        })}
      </nav>

      <div
        className="dashboard-signout"
        style={{ padding: '14px 12px', borderTop: '1px solid #1e293b' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: '#1e293b',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 800,
              color: '#60a5fa',
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
              Admin User
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Super Admin</div>
          </div>
        </div>
        <button
          onClick={() => onViewChange('landing')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: '#64748b',
            fontSize: 13,
          }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
