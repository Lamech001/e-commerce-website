import type { Gender, ProductType } from "../../data/mockData"
import type { InventoryProduct, OrderLineItem } from "../../data/localStore"

export type AdminSection = "overview" | "products" | "inventory" | "analytics" | "customers" | "orders" | "promotions"

export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled"
export type PromotionStatus = "Active" | "Expiring" | "Expired"
export type PromotionType = "Percentage" | "Fixed Amount" | "Free Shipping"

export interface ProductDraft {
  name: string
  sku: string
  brand: string
  type: ProductType
  gender: Gender
  price: string
  originalPrice: string
  stock: string
  rating: string
  reviews: string
  colors: string
  sizes: string
  badge: string
  badgeColor: string
  isNew: boolean
  isSale: boolean
}

export interface PromotionDraft {
  code: string
  type: PromotionType
  value: string
  minOrder: string
  limit: string
  expires: string
  status: PromotionStatus
}

export type ManagedProduct = InventoryProduct

export interface AdminOrder {
  id: string
  customer: string
  email: string
  phone: string
  date: string
  total: number
  items: number
  status: OrderStatus
  payment: string
  createdAt?: string
  lineItems?: OrderLineItem[]
}

export interface ManagedPromotion {
  id: number
  code: string
  type: PromotionType
  value: string
  minOrder: number
  uses: number
  limit: number | null
  expires: string
  status: PromotionStatus
}

export interface AdminCustomer {
  id: string
  name: string
  email: string
  joined: string
  orders: number
  spent: number
  status: "VIP" | "Active"
}
