import { ACCENT, DARK } from './constants'
import type { CustomerStat, CustomerSection, CustomerWishlistItem, StoredOrder } from './types'

interface CustomerOverviewProps {
  customerName: string
  stats: CustomerStat[]
  customerOrders: StoredOrder[]
  wishlist: CustomerWishlistItem[]
  onSectionChange: (section: CustomerSection) => void
}

export default function CustomerOverview({
  customerName,
  stats,
  customerOrders,
  wishlist,
  onSectionChange,
}: CustomerOverviewProps) {
  return (
    <div className="fade-in">
      <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 26, fontWeight: 800, color: DARK, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
        Good to see you, {customerName.split(' ')[0]}
      </h1>
      <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 32px' }}>Here's your style journey at a glance</p>

      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px' }}>
            <div style={{ width: 38, height: 38, background: s.color, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>{s.label === 'Orders' ? '📦' : s.label === 'Total Spent' ? '💳' : s.label === 'Saved Items' ? '❤️' : '⭐'}</span>
            </div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 24, fontWeight: 800, color: DARK, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{s.label}</div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 800, margin: 0 }}>Recent Orders</h3>
            <button onClick={() => onSectionChange('orders')} style={{ fontSize: 12.5, color: ACCENT, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
          </div>
          {customerOrders.slice(0, 3).map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <img src={o.image} alt="" style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 8, background: '#f1f5f9', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 600, color: DARK }}>{o.id}</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{o.date} · {o.items} item{o.items > 1 ? 's' : ''}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>KSh{o.total.toFixed(2)}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: o.statusColor, background: o.statusColor + '18', padding: '2px 8px', borderRadius: 10 }}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 15, fontWeight: 800, margin: 0 }}>Saved Items</h3>
            <button onClick={() => onSectionChange('wishlist')} style={{ fontSize: 12.5, color: ACCENT, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
          </div>
          {wishlist.slice(0, 3).map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <img src={item.image} alt={item.name} style={{ width: 46, height: 52, objectFit: 'cover', borderRadius: 8, background: '#f1f5f9', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.brand}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: ACCENT }}>KSh{item.price.toFixed(2)}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: item.inStock ? '#16a34a' : '#dc2626', background: item.inStock ? '#dcfce7' : '#fee2e2', padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>
                {item.inStock ? 'In Stock' : 'Sold Out'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
