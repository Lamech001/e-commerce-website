import type { Product } from "./mockData"
import type { InventoryProduct } from "./localStore"
import type {
  AdminOrder,
  ManagedPromotion,
  OrderStatus,
} from "../components/admin-dashboard/types"
import type { StoredOrder } from "../components/customer-dashboard/types"
import { supabase } from "../lib/supabase"
import { generateUuid } from "../lib/uuid"

const client = () => {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    )
  }
  return supabase
}

const getError = (error: { message: string } | null, context: string) => {
  if (error) throw new Error(`${context}: ${error.message}`)
}

const productFromRow = (row: Record<string, unknown>): InventoryProduct => {
  const stock = Number(row.stock)
  return {
    id: Number(row.id),
    name: String(row.name),
    sku: String(row.sku),
    brand: String(row.brand),
    type: row.product_type as Product["type"],
    gender: row.gender as Product["gender"],
    price: Number(row.price),
    originalPrice:
      row.original_price === null ? null : Number(row.original_price),
    rating: Number(row.rating),
    reviews: Number(row.reviews),
    stock,
    image: String(row.image_url ?? ""),
    badge: typeof row.badge === "string" ? row.badge : null,
    badgeColor: typeof row.badge_color === "string" ? row.badge_color : null,
    colors: Array.isArray(row.colors) ? row.colors.map(String) : [],
    sizes: Array.isArray(row.sizes) ? row.sizes.map(String) : [],
    isNew: Boolean(row.is_new),
    isSale: Boolean(row.is_sale),
    status: stock === 0 ? "Out of Stock" : stock < 10 ? "Low Stock" : "Active",
    sales: Number(row.units_sold),
    isActive: Boolean(row.is_active),
  }
}

export const fetchProducts = async (includeInactive = false) => {
  let query = client().from("products").select("*").order("id")
  if (!includeInactive) query = query.eq("is_active", true)
  const { data, error } = await query
  getError(error, "Unable to load products")
  return (data ?? []).map((row) => productFromRow(row))
}

const uploadProductImage = async (image: string, productId: number) => {
  if (!image.startsWith("data:")) return image
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
  if (!match) throw new Error("Product images must be PNG, JPG, or WebP.")
  const imageBlob = await (await fetch(image)).blob()
  const path = `products/${productId}-${generateUuid()}.webp`
  const { data, error } = await client()
    .storage.from("product-images")
    .upload(path, imageBlob, {
      contentType: match[1],
      cacheControl: "31536000",
      upsert: false,
    })
  getError(error, "Unable to upload product photo")
  if (!data) throw new Error("Supabase did not return the uploaded image path.")
  const { data: publicUrl } = client()
    .storage.from("product-images")
    .getPublicUrl(data.path)
  return publicUrl.publicUrl
}

export const saveProductRemote = async (product: InventoryProduct) => {
  const image = await uploadProductImage(product.image, product.id)
  const payload = {
    ...(product.id > 0 ? { id: product.id } : {}),
    name: product.name,
    sku: product.sku,
    brand: product.brand,
    product_type: product.type,
    gender: product.gender,
    price: product.price,
    original_price: product.originalPrice,
    stock: product.stock,
    image_url: image,
    colors: product.colors,
    sizes: product.sizes,
    rating: product.rating,
    reviews: product.reviews,
    badge: product.badge,
    badge_color: product.badgeColor,
    is_new: product.isNew,
    is_sale: product.isSale,
    is_active: product.isActive,
    units_sold: product.sales,
  }
  const { data, error } = await client()
    .from("products")
    .upsert(payload)
    .select("*")
    .single()
  getError(error, "Unable to save product")
  return productFromRow(data)
}

export const deleteProductRemote = async (id: number) => {
  const { error } = await client()
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
  getError(error, "Unable to delete product")
}

export const restoreProductRemote = async (id: number) => {
  const { error } = await client()
    .from("products")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id)
  getError(error, "Unable to restore product")
}

export const fetchPromotions = async (): Promise<ManagedPromotion[]> => {
  const { data, error } = await client()
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false })
  getError(error, "Unable to load promotions")
  return (data ?? []).map((row) => {
    const expires = row.expires_at
      ? String(row.expires_at).slice(0, 10)
      : "No expiry"
    const now = Date.now()
    const expired =
      !row.is_active ||
      (row.expires_at && new Date(row.expires_at).getTime() <= now)
    const expiringSoon =
      row.expires_at &&
      new Date(row.expires_at).getTime() - now < 7 * 86400000 &&
      new Date(row.expires_at).getTime() > now
    const value = Number(row.discount_value)
    return {
      id: Number(row.id),
      code: String(row.code),
      type:
        row.discount_type === "percentage"
          ? "Percentage"
          : row.discount_type === "fixed_amount"
            ? "Fixed Amount"
            : "Free Shipping",
      value:
        row.discount_type === "percentage"
          ? `${value}%`
          : row.discount_type === "fixed_amount"
            ? `KSh ${value}`
            : "KSh 0",
      minOrder: Number(row.minimum_subtotal),
      uses: Number(row.usage_count),
      limit: row.usage_limit === null ? null : Number(row.usage_limit),
      expires,
      status: expired ? "Expired" : expiringSoon ? "Expiring" : "Active",
    }
  })
}

export interface StorefrontPromotion {
  code: string
  type: "percentage" | "fixed_amount" | "free_shipping"
  value: number
  minimumSubtotal: number
  expiresAt: string | null
}

export const fetchAvailablePromotions =
  async (): Promise<StorefrontPromotion[]> => {
    const { data, error } = await client()
      .from("promotions")
      .select(
        "code,discount_type,discount_value,minimum_subtotal,usage_limit,usage_count,starts_at,expires_at",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
    getError(error, "Unable to load available promotions")
    const now = Date.now()
    return (data ?? [])
      .filter(
        (row) =>
          (!row.starts_at || new Date(row.starts_at).getTime() <= now) &&
          (!row.expires_at || new Date(row.expires_at).getTime() > now) &&
          (row.usage_limit === null || row.usage_count < row.usage_limit),
      )
      .map((row) => ({
        code: String(row.code),
        type: row.discount_type as StorefrontPromotion["type"],
        value: Number(row.discount_value),
        minimumSubtotal: Number(row.minimum_subtotal),
        expiresAt: row.expires_at ? String(row.expires_at) : null,
      }))
  }

const promotionFields = (promotion: ManagedPromotion) => {
  const value =
    promotion.type === "Free Shipping"
      ? 0
      : Number.parseFloat(promotion.value.replace(/[^\d.]/g, "")) || 0
  const discountType =
    promotion.type === "Percentage"
      ? "percentage"
      : promotion.type === "Fixed Amount"
        ? "fixed_amount"
        : "free_shipping"
  const expiresAt =
    !promotion.expires || promotion.expires === "No expiry"
      ? null
      : new Date(`${promotion.expires}T23:59:59.999Z`).toISOString()
  return {
    code: promotion.code.toUpperCase(),
    discount_type: discountType,
    discount_value: value,
    minimum_subtotal: promotion.minOrder,
    usage_limit: promotion.limit,
    is_active: promotion.status !== "Expired",
    expires_at: expiresAt,
  }
}

export const savePromotionRemote = async (promotion: ManagedPromotion) => {
  const fields = promotionFields(promotion)
  const request =
    promotion.id > 0
      ? client()
          .from("promotions")
          .update(fields)
          .eq("id", promotion.id)
          .select("id")
          .single()
      : client().from("promotions").insert(fields).select("id").single()
  const { data, error } = await request
  getError(error, "Unable to save promotion")
  if (!data) throw new Error("Supabase did not return the saved promotion.")
  const savedPromotion = (await fetchPromotions()).find(
    (item) => item.id === Number(data.id),
  )
  if (!savedPromotion) {
    throw new Error("The saved promotion could not be loaded from Supabase.")
  }
  return savedPromotion
}

export const deletePromotionRemote = async (id: number) => {
  const { error } = await client().from("promotions").delete().eq("id", id)
  getError(error, "Unable to delete promotion")
}

export const validatePromotionRemote = async (
  code: string,
  subtotal: number,
) => {
  const { data, error } = await client()
    .from("promotions")
    .select(
      "id,code,discount_type,discount_value,minimum_subtotal,usage_limit,usage_count,starts_at,expires_at,is_active",
    )
    .eq("code", code.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle()
  getError(error, "Unable to validate promotion")
  if (!data) throw new Error("This promotion code is not valid.")
  const now = Date.now()
  if (
    (data.starts_at && new Date(data.starts_at).getTime() > now) ||
    (data.expires_at && new Date(data.expires_at).getTime() <= now) ||
    (data.usage_limit !== null && data.usage_count >= data.usage_limit)
  ) {
    throw new Error("This promotion code has expired or reached its use limit.")
  }
  if (subtotal < Number(data.minimum_subtotal)) {
    throw new Error(
      `This code requires a minimum subtotal of KSh ${Number(data.minimum_subtotal).toFixed(2)}.`,
    )
  }
  const discount =
    data.discount_type === "percentage"
      ? Math.round(((subtotal * Number(data.discount_value)) / 100) * 100) / 100
      : data.discount_type === "fixed_amount"
        ? Math.min(subtotal, Number(data.discount_value))
        : 0
  return {
    code: data.code as string,
    discount,
    discountType: data.discount_type as StorefrontPromotion["type"],
    promotionId: data.id as number,
  }
}

export const placeOrderRemote = async (args: {
  customer: {
    fullName: string
    email: string
    phone: string
    address: string
    city: string
    postcode: string
  }
  accessToken: string
  items: {
    productId: number
    quantity: number
  }[]
  promotionCode?: string
  deliveryZone: string
}) => {
  const { data, error } = await client().rpc("place_guest_order", {
    p_customer: args.customer,
    p_items: args.items,
    p_access_token: args.accessToken,
    p_promotion_code: args.promotionCode || null,
    p_delivery_zone: args.deliveryZone,
  })
  getError(error, "Unable to place order")
  return data as {
    orderNumber: string
    subtotal: number
    discount: number
    total: number
  }
}

export const fetchAdminOrders = async (): Promise<AdminOrder[]> => {
  const { data, error } = await client()
    .from("orders")
    .select(
      "id,order_number,subtotal,discount_amount,total,status,payment_status,created_at,customers(full_name,email,phone),order_items(product_id,product_name,quantity,unit_price,products(product_type))",
    )
    .order("created_at", { ascending: false })
  getError(error, "Unable to load orders")
  return (data ?? []).map((row) => {
    const customer = row.customers as unknown as {
      full_name: string
      email: string
      phone: string
    }
    const items = (row.order_items ?? []) as Array<{
      product_id: number | null
      product_name: string
      quantity: number
      unit_price: number
      products: { product_type: string }[] | null
    }>
    return {
      id: String(row.order_number),
      customer: customer.full_name,
      email: customer.email,
      phone: customer.phone,
      date: new Date(row.created_at).toLocaleDateString("en-KE"),
      createdAt: row.created_at,
      total: Number(row.total),
      items: items.reduce((sum, item) => sum + item.quantity, 0),
      status: row.status as OrderStatus,
      payment: String(row.payment_status),
      lineItems: items.map((item) => ({
        productId: Number(item.product_id ?? 0),
        name: item.product_name,
        category: (item.products?.[0]?.product_type ||
          "Clothing") as "Clothing" | "Shoes" | "Bags" | "Accessories",
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
      })),
    }
  })
}

export const setOrderStatusRemote = async (
  orderNumber: string,
  status: OrderStatus,
) => {
  const updates: {
    status: OrderStatus
    payment_status?: string
    updated_at: string
  } = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === "Delivered") updates.payment_status = "Paid"
  const { error } = await client()
    .from("orders")
    .update(updates)
    .eq("order_number", orderNumber)
  getError(error, "Unable to update order")
}

export const fetchCustomerOrders = async (
  email: string,
  accessToken: string,
): Promise<StoredOrder[]> => {
  const { data, error } = await client().rpc("get_customer_orders", {
    p_email: email.trim().toLowerCase(),
    p_access_token: accessToken,
  })
  getError(error, "Unable to load customer orders")
  return (data ?? []) as StoredOrder[]
}

export const updateCustomerProfileRemote = async (args: {
  email: string
  accessToken: string
  customer: {
    fullName: string
    email: string
    phone: string
    address: string
    city: string
    postcode: string
  }
}) => {
  const { error } = await client().rpc("update_customer_profile", {
    p_email: args.email.trim().toLowerCase(),
    p_access_token: args.accessToken,
    p_customer: args.customer,
  })
  getError(error, "Unable to update customer profile")
}

export const cancelCustomerOrderRemote = async (args: {
  email: string
  accessToken: string
  orderNumber: string
}) => {
  const { error } = await client().rpc("cancel_customer_order", {
    p_email: args.email.trim().toLowerCase(),
    p_access_token: args.accessToken,
    p_order_number: args.orderNumber,
  })
  getError(error, "Unable to cancel order")
}
