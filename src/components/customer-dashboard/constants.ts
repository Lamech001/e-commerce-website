import {
  Heart,
  LayoutDashboard,
  MessageCircle,
  Package,
  User,
} from 'lucide-react'
import type { CustomerSection } from './types'

export const ACCENT = '#2563eb'
export const DARK = '#0f172a'

export const ORDER_STATUS_COLORS: Record<string, string> = {
  Pending: '#d97706',
  Processing: '#2563eb',
  Shipped: '#7c3aed',
  Delivered: '#16a34a',
  Cancelled: '#dc2626',
}

export const CUSTOMER_NAV_ITEMS: {
  id: CustomerSection
  label: string
  icon: typeof LayoutDashboard
  badge?: number
}[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Order History', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'profile', label: 'Profile & Settings', icon: User },
  { id: 'support', label: 'Support Chat', icon: MessageCircle, badge: 1 },
]
