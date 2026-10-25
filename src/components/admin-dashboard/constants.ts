import {
  BarChart3,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Users,
  Warehouse,
} from 'lucide-react'
import type { AdminSection, OrderStatus } from './types'

export const ACCENT = '#2563eb'
export const DARK = '#0f172a'

export const ADMIN_NAV_ITEMS: {
  id: AdminSection
  label: string
  icon: typeof LayoutDashboard
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'inventory', label: 'Inventory', icon: Warehouse },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'orders', label: 'Order Fulfillment', icon: ShoppingBag },
  { id: 'promotions', label: 'Promotions', icon: Tag },
]

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  Pending: '#d97706',
  Processing: '#2563eb',
  Shipped: '#7c3aed',
  Delivered: '#16a34a',
  Cancelled: '#dc2626',
}

export const getInventoryStatus = (stock: number) =>
  stock === 0
    ? { label: 'Out of Stock', color: '#dc2626', bg: '#fee2e2' }
    : stock < 10
      ? { label: 'Low Stock', color: '#d97706', bg: '#fef3c7' }
      : { label: 'In Stock', color: '#16a34a', bg: '#dcfce7' }
