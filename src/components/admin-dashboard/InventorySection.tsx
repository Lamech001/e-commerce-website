import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, Download } from 'lucide-react'
import { ACCENT, DARK, getInventoryStatus } from './constants'
import type { ManagedProduct } from './types'

interface InventorySectionProps {
  products: ManagedProduct[]
}

export default function InventorySection({ products }: InventorySectionProps) {
  const stockAlerts = products.filter(product => product.stock <= 24)
  const stats = [
    { label: 'Total SKUs', value: products.length, accent: ACCENT },
    {
      label: 'In Stock',
      value: products.filter(product => product.stock > 10).length,
      accent: '#059669',
    },
    {
      label: 'Low Stock',
      value: products.filter(
        product => product.stock > 0 && product.stock <= 10,
      ).length,
      accent: '#d97706',
    },
    {
      label: 'Out of Stock',
      value: products.filter(product => product.stock === 0).length,
      accent: '#dc2626',
    },
  ]

  const exportStockAlerts = () => {
    const rows = [
      ['Product', 'SKU', 'Brand', 'Stock', 'Status'],
      ...stockAlerts.map(product => [
        product.name,
        product.sku,
        product.brand,
        String(product.stock),
        getInventoryStatus(product.stock).label,
      ]),
    ]
    const csv = rows
      .map(row =>
        row.map(value => `"${value.replace(/"/g, '""')}"`).join(','),
      )
      .join('\n')
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'nelzcollections-stock-alerts.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fade-in">
      <div
        className="dashboard-stats-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {stats.map(stat => (
          <div
            key={stat.label}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '18px 22px',
            }}
          >
            <div
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 30,
                fontWeight: 800,
                color: DARK,
                marginBottom: 4,
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: stat.accent }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 15,
            fontWeight: 800,
            margin: '0 0 20px',
          }}
        >
          Stock Levels by Product
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={products.map(product => ({
              name: product.name.split(' ').slice(0, 2).join(' '),
              stock: product.stock,
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
              {products.map(product => (
                <Cell
                  key={product.id}
                  fill={
                    product.stock === 0
                      ? '#dc2626'
                      : product.stock < 10
                        ? '#d97706'
                        : ACCENT
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 15,
              fontWeight: 800,
              margin: 0,
            }}
          >
            Stock Alerts
          </h3>
          <button
            onClick={exportStockAlerts}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#475569',
            }}
          >
            <Download size={13} /> Export
          </button>
        </div>
        {stockAlerts.map(product => {
          const inventoryStatus = getInventoryStatus(product.stock)

          return (
            <div
              key={product.id}
              className="inventory-alert-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 24px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: inventoryStatus.bg,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={16} color={inventoryStatus.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: DARK }}>
                  {product.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {product.sku} · {product.brand}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 17,
                  fontWeight: 800,
                  color: inventoryStatus.color,
                }}
              >
                {product.stock} units
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: inventoryStatus.color,
                  background: inventoryStatus.bg,
                  padding: '3px 10px',
                  borderRadius: 10,
                }}
              >
                {inventoryStatus.label}
              </span>
              <button
                style={{
                  padding: '7px 16px',
                  background: '#dbeafe',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: ACCENT,
                }}
              >
                Reorder
              </button>
            </div>
          )
        })}
        {stockAlerts.length === 0 && (
          <p style={{ padding: '24px', color: '#64748b', fontSize: 13.5 }}>
            All products have healthy stock levels.
          </p>
        )}
      </div>
    </div>
  )
}
