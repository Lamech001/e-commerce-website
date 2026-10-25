import type { wishlistItems } from "../../data/mockData"
import type { CustomerProfile, OrderLineItem } from "../../data/localStore"

export type CustomerSection = "overview" | "orders" | "wishlist" | "profile" | "support"

export type StoredCustomer = CustomerProfile

export interface StoredOrder {
  id: string
  customer: string
  email: string
  phone: string
  date: string
  total: number
  items: number
  status: string
  payment: string
  products: string[]
  image: string
  statusColor: string
  lineItems?: OrderLineItem[]
}

export type CustomerWishlistItem = typeof wishlistItems[number]

export interface CustomerStat {
  label: string
  value: string
  sub: string
  color: string
  accent: string
}
