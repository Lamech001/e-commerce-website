import { Bell, Settings } from 'lucide-react'
import { ADMIN_NAV_ITEMS, DARK } from './constants'
import type { AdminSection, AdminOrder } from './types'

interface AdminTopBarProps {
  section: AdminSection
  orders: AdminOrder[]
  onNotice: (notice: string) => void
}

export default function AdminTopBar({
  section,
  orders,
  onNotice,
}: AdminTopBarProps) {
  const pendingOrders = orders.filter(order => order.status === 'Pending').length
  const sectionTitle = ADMIN_NAV_ITEMS.find(item => item.id === section)?.label

  return (
    <header
      className="admin-topbar"
      style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 36px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 18,
            fontWeight: 800,
            color: DARK,
            margin: 0,
            letterSpacing: '-0.3px',
          }}
        >
          {sectionTitle}
        </h1>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Nelzcollections · Jul 21, 2026
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onNotice(`${pendingOrders} pending order notifications`)}
          aria-label="View notifications"
          style={{
            width: 36,
            height: 36,
            background: '#f1f5f9',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Bell size={15} color="#64748b" />
          {pendingOrders > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 7,
                right: 7,
                width: 7,
                height: 7,
                background: '#dc2626',
                borderRadius: '50%',
              }}
            />
          )}
        </button>
        <button
          onClick={() => onNotice('Store settings are up to date.')}
          aria-label="Check store settings"
          style={{
            width: 36,
            height: 36,
            background: '#f1f5f9',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings size={15} color="#64748b" />
        </button>
      </div>
    </header>
  )
}
