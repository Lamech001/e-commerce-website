import { adminProducts, products } from "./mockData"
import type { Product } from "./mockData"

export const ORDERS_STORAGE_KEY = "shoparc-orders"
export const INVENTORY_STORAGE_KEY = "shoparc-admin-products"
export const CUSTOMER_STORAGE_KEY = "shoparc-customer"
const INVENTORY_VERSION_KEY = "shoparc-inventory-version"
export const ANALYTICS_CACHE_KEY = "shoparc-analytics-cache"
const CURRENT_INVENTORY_VERSION = "3"

export interface CustomerProfile {
  name: string
  email: string
  phone: string
  address: string
  city: string
  postcode: string
  createdAt: string
}

export interface InventoryProduct extends Product {
  sku: string
  status: string
  sales: number
  isActive: boolean
}

export interface OrderLineItem {
  productId: number
  name: string
  category: Product["type"]
  quantity: number
  unitPrice: number
}

export const loadCustomerProfile = (): CustomerProfile | null => {
  try {
    const stored = localStorage.getItem(CUSTOMER_STORAGE_KEY)
    if (!stored) return null
    const parsed: unknown = JSON.parse(stored)
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Expected a saved customer profile object.")
    }

    const value = parsed as Partial<CustomerProfile>
    let address = typeof value.address === "string" ? value.address : ""
    let city = typeof value.city === "string" ? value.city : ""
    let postcode = typeof value.postcode === "string" ? value.postcode : ""
    if (!city && address.includes(",")) {
      const separator = address.lastIndexOf(",")
      const legacyLocation = address
        .slice(separator + 1)
        .trim()
        .split(/\s+/)
      address = address.slice(0, separator).trim()
      if (!postcode && /^\d{5}$/.test(legacyLocation.at(-1) || "")) {
        postcode = legacyLocation.pop() || ""
      }
      city = legacyLocation.join(" ")
    }

    return {
      name: typeof value.name === "string" ? value.name : "",
      email: typeof value.email === "string" ? value.email : "",
      phone: typeof value.phone === "string" ? value.phone : "",
      address,
      city,
      postcode,
      createdAt:
        typeof value.createdAt === "string"
          ? value.createdAt
          : new Date().toISOString(),
    }
  } catch (error) {
    console.error("Unable to load saved customer details.", error)
    return null
  }
}

export const saveCustomerProfile = (customer: CustomerProfile) => {
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer))
}

const inventoryStatus = (stock: number) =>
  stock === 0 ? "Out of Stock" : stock < 10 ? "Low Stock" : "Active"

const isProductType = (value: unknown): value is Product["type"] =>
  value === "Clothing" ||
  value === "Shoes" ||
  value === "Bags" ||
  value === "Accessories"

const isGender = (value: unknown): value is Product["gender"] =>
  value === "Men" || value === "Women" || value === "Kids" || value === "Unisex"

const createInitialInventory = (): InventoryProduct[] =>
  products.map((product) => {
    const adminProduct = adminProducts.find((item) => item.id === product.id)
    return {
      ...product,
      sku: adminProduct?.sku || `NEL-${product.id.toString().padStart(4, "0")}`,
      status: inventoryStatus(product.stock),
      sales: 0,
      isActive: true,
    }
  })

const createAdditionalInventoryProduct = (
  saved: Partial<InventoryProduct> & Pick<InventoryProduct, "id" | "name" | "brand" | "type" | "gender" | "price" | "stock">,
): InventoryProduct => ({
  id: saved.id,
  name: saved.name,
  brand: saved.brand,
  type: saved.type,
  gender: saved.gender,
  price: saved.price,
  stock: saved.stock,
  originalPrice: saved.originalPrice ?? null,
  rating: saved.rating ?? 0,
  reviews: saved.reviews ?? 0,
  image: saved.image ?? "",
  badge: saved.badge ?? null,
  badgeColor: saved.badgeColor ?? null,
  colors: saved.colors ?? ["#2563eb"],
  sizes: saved.sizes ?? ["One Size"],
  isNew: saved.isNew ?? true,
  isSale: saved.isSale ?? false,
  sku: saved.sku || `NEL-${saved.id.toString().padStart(4, "0")}`,
  status: saved.status || inventoryStatus(saved.stock),
  sales: saved.sales ?? 0,
  isActive: saved.isActive ?? true,
})

const readArray = <T>(key: string): T[] | null => {
  let stored: string | null
  try {
    stored = localStorage.getItem(key)
  } catch (error) {
    console.error(`Unable to read ${key} from local storage.`, error)
    return null
  }
  if (stored === null) return null

  try {
    const parsed: unknown = JSON.parse(stored)
    if (Array.isArray(parsed)) return parsed as T[]
    console.error(
      `Ignoring invalid local storage data for ${key}: expected an array.`,
    )
  } catch (error) {
    console.error(`Ignoring invalid JSON in local storage key ${key}.`, error)
  }
  return null
}

export const loadOrders = <T>(): T[] => readArray<T>(ORDERS_STORAGE_KEY) ?? []

export const saveOrders = <T>(orders: T[]) => {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
}

export const loadInventory = (): InventoryProduct[] => {
  const saved = readArray<Partial<InventoryProduct>>(INVENTORY_STORAGE_KEY)
  if (saved === null) {
    const initial = createInitialInventory()
    try {
      persistAtomically([
        [INVENTORY_STORAGE_KEY, initial],
        [INVENTORY_VERSION_KEY, CURRENT_INVENTORY_VERSION],
      ])
    } catch (error) {
      console.error(
        "Unable to cache the initial product inventory in local storage.",
        error,
      )
    }
    return initial
  }

  let shouldMigrate = true
  try {
    shouldMigrate =
      localStorage.getItem(INVENTORY_VERSION_KEY) !== CURRENT_INVENTORY_VERSION
  } catch (error) {
    console.error("Unable to check the cached inventory version.", error)
  }

  const savedById = new Map(
    saved
      .filter(
        (
          item,
        ): item is Partial<InventoryProduct> & Pick<InventoryProduct, "id"> =>
          typeof item?.id === "number" &&
          Number.isInteger(item.id) &&
          item.id > 0,
      )
      .map((item) => [item.id, item]),
  )
  const baseProducts = products
    .filter((product) => shouldMigrate || savedById.has(product.id))
    .map((product) => {
      const stored = savedById.get(product.id)
      savedById.delete(product.id)
      return {
        ...product,
        ...stored,
        sku: stored?.sku || `NEL-${product.id.toString().padStart(4, "0")}`,
        status:
          stored?.status || inventoryStatus(stored?.stock ?? product.stock),
        sales: shouldMigrate ? 0 : (stored?.sales ?? 0),
        isActive: stored?.isActive ?? true,
      } satisfies InventoryProduct
    })
  const additionalProducts = saved
    .filter(
      (
        item,
      ): item is Partial<InventoryProduct> & Pick<InventoryProduct, "id" | "name" | "brand" | "type" | "gender" | "price" | "stock"> =>
        typeof item?.id === "number" &&
        Number.isInteger(item.id) &&
        item.id > 0 &&
        typeof item.name === "string" &&
        typeof item.brand === "string" &&
        isProductType(item.type) &&
        isGender(item.gender) &&
        typeof item.price === "number" &&
        Number.isFinite(item.price) &&
        item.price > 0 &&
        typeof item.stock === "number" &&
        Number.isInteger(item.stock) &&
        item.stock >= 0 &&
        savedById.has(item.id),
    )
    .map(createAdditionalInventoryProduct)

  const inventory = [...baseProducts, ...additionalProducts]
  if (shouldMigrate) {
    try {
      persistAtomically([
        [INVENTORY_STORAGE_KEY, inventory],
        [INVENTORY_VERSION_KEY, CURRENT_INVENTORY_VERSION],
      ])
    } catch (error) {
      console.error("Unable to migrate the cached product inventory.", error)
    }
  }
  return inventory
}

export const saveInventory = (inventory: InventoryProduct[]) => {
  persistAtomically([
    [INVENTORY_STORAGE_KEY, inventory],
    [INVENTORY_VERSION_KEY, CURRENT_INVENTORY_VERSION],
  ])
}

const persistAtomically = (
  updates: ReadonlyArray<readonly [string, unknown]>,
) => {
  const previous = updates.map(
    ([key]) => [key, localStorage.getItem(key)] as const,
  )

  try {
    for (const [key, value] of updates) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch (error) {
    for (const [key, value] of previous) {
      try {
        if (value === null) localStorage.removeItem(key)
        else localStorage.setItem(key, value)
      } catch (restoreError) {
        console.error(
          `Unable to restore local storage key ${key} after checkout failed.`,
          restoreError,
        )
      }
    }
    throw error
  }
}

export function persistCheckout<TOrder, TCustomer>(
  order: TOrder,
  inventory: InventoryProduct[],
  customer: TCustomer,
) {
  persistAtomically([
    [ORDERS_STORAGE_KEY, [order, ...loadOrders<TOrder>()]],
    [INVENTORY_STORAGE_KEY, inventory],
    [CUSTOMER_STORAGE_KEY, customer],
  ])
}

export const persistOrderCancellation = <TOrder,>(
  orders: TOrder[],
  inventory: InventoryProduct[],
) =>
  persistAtomically([
    [ORDERS_STORAGE_KEY, orders],
    [INVENTORY_STORAGE_KEY, inventory],
  ])

export const toStorefrontProduct = ({
  sku: _sku,
  status: _status,
  sales: _sales,
  ...product
}: InventoryProduct): Product => product
