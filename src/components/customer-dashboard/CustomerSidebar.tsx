import { ArrowLeft, LogOut } from 'lucide-react'
import { ACCENT, CUSTOMER_NAV_ITEMS, DARK } from './constants'
import type { CustomerSection } from './types'

interface CustomerSidebarProps {
  profileName: string
  wishlistCount: number
  section: CustomerSection
  onSectionChange: (section: CustomerSection) => void
  onViewChange: (view: string) => void
}

export default function CustomerSidebar({
  profileName,
  wishlistCount,
  section,
  onSectionChange,
  onViewChange,
}: CustomerSidebarProps) {
  const navItems = CUSTOMER_NAV_ITEMS.map(item =>
    item.id === 'wishlist' ? { ...item, badge: wishlistCount } : item,
  )

  return (
    <aside className="dashboard-sidebar" style={{ width: 248, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
      <div className="dashboard-brand" style={{ padding: '22px 20px 16px' }}>
        <button onClick={() => onViewChange('landing')} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12.5, marginBottom: 22, padding: 0, fontWeight: 500 }}>
          <ArrowLeft size={14} /> Back to Store
        </button>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 19, color: DARK, letterSpacing: '-0.3px' }}>
          nelz<span style={{ color: ACCENT }}>collections</span>
        </div>
        <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>My Account</div>
      </div>

      <div className="dashboard-nav" style={{ padding: '6px 12px', flex: 1 }}>
        <div className="dashboard-avatar" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', marginBottom: 16, background: '#f8fafc', borderRadius: 10 }}>
          <div style={{ width: 40, height: 40, background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: ACCENT, flexShrink: 0 }}>S</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK }}>{profileName}</div>
            <div style={{ fontSize: 11.5, color: '#d97706', fontWeight: 700 }}>✦ Gold Member</div>
          </div>
        </div>

        {navItems.map(item => {
          const Icon = item.icon
          const active = section === item.id
          return (
            <button key={item.id} onClick={() => onSectionChange(item.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left', background: active ? '#eff6ff' : 'transparent', color: active ? ACCENT : '#64748b', fontWeight: active ? 700 : 500, fontSize: 13.5, transition: 'all 0.15s', borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent' }}
              onMouseEnter={event => { if (!active) (event.currentTarget.style.background = '#f8fafc') }}
              onMouseLeave={event => { if (!active) (event.currentTarget.style.background = 'transparent') }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge ? <span style={{ background: active ? ACCENT : '#e2e8f0', color: active ? '#fff' : '#64748b', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{item.badge}</span> : null}
            </button>
          )
        })}
      </div>

      <div className="dashboard-signout" style={{ padding: '14px 12px', borderTop: '1px solid #e2e8f0' }}>
        <button onClick={() => onViewChange('landing')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: 13.5, fontWeight: 500 }}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
