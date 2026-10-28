import { useEffect, useState } from "react"
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  X,
  Eye,
} from "lucide-react"
import {
  deleteProductRemote,
  deletePromotionRemote,
  fetchAdminOrders,
  fetchProducts,
  fetchPromotions,
  saveProductRemote,
  savePromotionRemote,
  restoreProductRemote,
  setOrderStatusRemote,
} from "../../data/supabaseStore"
import AdminSidebar from "./AdminSidebar"
import AdminTopBar from "./AdminTopBar"
import AnalyticsSection from "./AnalyticsSection"
import InventorySection from "./InventorySection"
import {
  ACCENT,
  DARK,
  getInventoryStatus,
  ORDER_STATUS_COLORS,
} from "./constants"
import type {
  AdminCustomer,
  AdminOrder,
  AdminSection,
  ManagedProduct,
  ManagedPromotion,
  OrderStatus,
  ProductDraft,
  PromotionDraft,
  PromotionStatus,
  PromotionType,
} from "./types"

interface Props {
  onViewChange: (v: string) => void
  authError?: string
}
const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  name: "",
  sku: "",
  brand: "",
  type: "Clothing",
  gender: "Women",
  price: "",
  originalPrice: "",
  stock: "",
  rating: "0",
  reviews: "0",
  colors: "Blue",
  sizes: "One Size",
  badge: "",
  badgeColor: "Blue",
  isNew: true,
  isSale: false,
}
const EMPTY_PROMOTION_DRAFT: PromotionDraft = {
  code: "",
  type: "Percentage",
  value: "",
  minOrder: "",
  limit: "",
  expires: "",
  status: "Active",
}

const formatPromotionExpiry = (expires: string) =>
  expires === "No expiry"
    ? expires
    : new Date(`${expires}T00:00:00`).toLocaleDateString("en-KE", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })

const PRODUCT_IMAGE_TARGET_BYTES = 200_000

const compressProductImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = async () => {
      URL.revokeObjectURL(imageUrl)
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      if (!context) {
        reject(new Error("Image processing is not supported by this browser."))
        return
      }

      const initialScale = Math.min(
        1,
        1200 / Math.max(image.width, image.height),
      )
      let bestEffortBlob: Blob | null = null
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const scale = initialScale * Math.pow(0.82, Math.floor(attempt / 3))
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const quality = [0.82, 0.68, 0.54][attempt % 3]
        const blob = await new Promise<Blob | null>((blobResolve) => {
          canvas.toBlob(blobResolve, "image/webp", quality)
        })
        if (!blob) {
          reject(new Error("The selected photo could not be processed."))
          return
        }
        if (!bestEffortBlob || blob.size < bestEffortBlob.size) {
          bestEffortBlob = blob
        }
        if (blob.size <= PRODUCT_IMAGE_TARGET_BYTES) {
          bestEffortBlob = blob
          break
        }
      }

      if (!bestEffortBlob) {
        reject(new Error("The selected photo could not be processed."))
        return
      }

      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () =>
        reject(
          reader.error || new Error("The processed photo could not be read."),
        )
      reader.readAsDataURL(bestEffortBlob)
    }
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      reject(
        new Error(
          "The selected photo could not be opened. Choose a PNG, JPG, or WebP image.",
        ),
      )
    }
    image.src = imageUrl
  })

export default function AdminDashboard({ onViewChange, authError }: Props) {
  const [section, setSection] = useState<AdminSection>("overview")
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [products, setProducts] = useState<ManagedProduct[]>([])
  const [managedPromotions, setManagedPromotions] =
    useState<ManagedPromotion[]>([])
  const [prodSearch, setProdSearch] = useState("")
  const [orderSearch, setOrderSearch] = useState("")
  const [custSearch, setCustSearch] = useState("")
  const [orderFilter, setOrderFilter] = useState("All")
  const [showAdd, setShowAdd] = useState(false)
  const [newProd, setNewProd] = useState<ProductDraft>(EMPTY_PRODUCT_DRAFT)
  const [newProdImage, setNewProdImage] = useState("")
  const [newProdImageName, setNewProdImageName] = useState("")
  const [isProcessingProductImage, setIsProcessingProductImage] =
    useState(false)
  const [addError, setAddError] = useState("")
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null)
  const [promoError, setPromoError] = useState("")
  const [promoDraft, setPromoDraft] = useState<PromotionDraft>(
    EMPTY_PROMOTION_DRAFT,
  )
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [selectedCustomer, setSelectedCustomer] =
    useState<AdminCustomer | null>(null)
  const [adminNotice, setAdminNotice] = useState("")
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (authError) setAdminNotice(authError)
  }, [authError])

  useEffect(() => {
    let active = true
    setIsLoadingData(true)
    void Promise.all([
      fetchProducts(true),
      fetchAdminOrders(),
      fetchPromotions(),
    ])
      .then(([loadedProducts, loadedOrders, loadedPromotions]) => {
        if (!active) return
        setProducts(loadedProducts)
        setOrders(loadedOrders)
        setManagedPromotions(loadedPromotions)
        setIsLoadingData(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load data from Supabase."
        console.error("Unable to load admin data from Supabase.", error)
        setAdminNotice(message)
        setIsLoadingData(false)
      })
    return () => {
      active = false
    }
  }, [])

  const validOrders = orders.filter((order) => order.status !== "Cancelled")
  const revenue = validOrders.reduce((sum, order) => sum + order.total, 0)
  const activeCustomers = new Set(
    validOrders.map((order) => order.email.toLowerCase()).filter(Boolean),
  ).size
  const averageOrderValue = validOrders.length
    ? revenue / validOrders.length
    : 0
  const customers = Array.from(
    validOrders
      .reduce((map, order) => {
        const email = order.email.toLowerCase()
        if (!email) return map
        const current = map.get(email)
        map.set(email, {
          id: email,
          name: order.customer,
          email: order.email,
          joined: current?.joined || order.date,
          orders: (current?.orders || 0) + 1,
          spent: (current?.spent || 0) + order.total,
          status:
            (current?.spent || 0) + order.total >= 5000 ? "VIP" : "Active",
        })
        return map
      }, new Map<string, AdminCustomer>())
      .values(),
  )
  const kpis = [
    {
      label: "Revenue",
      value: `KSh ${revenue.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: "#dbeafe",
      icon: "KSh",
    },
    {
      label: "Orders",
      value: String(validOrders.length),
      color: "#d1fae5",
      icon: "No.",
    },
    {
      label: "Active Customers",
      value: String(activeCustomers),
      color: "#ede9fe",
      icon: "ID",
    },
    {
      label: "Avg Order Value",
      value: `KSh ${averageOrderValue.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: "#fef3c7",
      icon: "Avg",
    },
  ]

  const saveProduct = async () => {
    if (isProcessingProductImage) return
    if (
      !newProd.name.trim() ||
      !newProd.brand.trim() ||
      !newProd.price ||
      (!editingProductId && !newProdImage)
    ) {
      setAddError(
        "Add a product name, brand, price, and photo before publishing.",
      )
      return
    }
    const price = Number(newProd.price)
    const originalPrice = newProd.originalPrice.trim()
      ? Number(newProd.originalPrice)
      : null
    const stock = newProd.stock.trim() ? Number(newProd.stock) : 0
    const rating = Number(newProd.rating)
    const reviews = Number(newProd.reviews)
    const colors = newProd.colors
      .split(",")
      .map((color) => color.trim())
      .filter(Boolean)
    const badgeColor = newProd.badgeColor.trim()
    if (
      colors.some((color) => !CSS.supports("color", color)) ||
      (newProd.badge.trim() && !CSS.supports("color", badgeColor))
    ) {
      setAddError(
        "Enter valid CSS color names (such as Black, White, Blue, or Maroon) or hex colors.",
      )
      return
    }
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      (originalPrice !== null &&
        (!Number.isFinite(originalPrice) || originalPrice < price)) ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      !Number.isFinite(rating) ||
      rating < 0 ||
      rating > 5 ||
      !Number.isInteger(reviews) ||
      reviews < 0
    ) {
      setAddError(
        "Enter valid price, original price (not below the sale price), stock, rating (0–5), and review count.",
      )
      return
    }
    const existing = products.find((product) => product.id === editingProductId)
    const savedProduct: ManagedProduct = {
      id: editingProductId ?? 0,
      name: newProd.name.trim(),
      sku: newProd.sku.trim() || `NEL-${Date.now().toString().slice(-8)}`,
      brand: newProd.brand.trim(),
      type: newProd.type,
      gender: newProd.gender,
      price,
      originalPrice,
      stock,
      rating,
      reviews,
      status:
        stock === 0 ? "Out of Stock" : stock < 10 ? "Low Stock" : "Active",
      sales: existing?.sales || 0,
      image: newProdImage || existing?.image || "",
      badge: newProd.badge.trim() || null,
      badgeColor: newProd.badge.trim() ? badgeColor : null,
      colors,
      sizes: newProd.sizes
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean),
      isNew: newProd.isNew,
      isSale: newProd.isSale,
      isActive: existing?.isActive ?? true,
    }
    try {
      const saved = await saveProductRemote(savedProduct)
      setProducts((current) =>
        editingProductId
          ? current.map((product) =>
              product.id === saved.id ? saved : product,
            )
          : [saved, ...current],
      )
      setAddError("")
      setAdminNotice("Product saved to Supabase.")
      resetProductForm()
    } catch (error) {
      console.error("Unable to save product to Supabase.", error)
      const message =
        error instanceof Error
          ? error.message
          : "Could not save product to Supabase."
      setAddError(message)
      setAdminNotice(message)
    }
  }
  const deleteProd = async (id: number) => {
    const product = products.find((item) => item.id === id)
    if (
      product &&
      window.confirm(
        `Hide "${product.name}" from the customer storefront? You can restore it later.`,
      )
    ) {
      try {
        await deleteProductRemote(id)
        setProducts((current) =>
          current.map((item) =>
            item.id === id ? { ...item, isActive: false } : item,
          ),
        )
        setAdminNotice("Product hidden from the storefront.")
      } catch (error) {
        console.error("Unable to delete product from Supabase.", error)
        setAdminNotice(
          error instanceof Error ? error.message : "Unable to delete product.",
        )
      }
    }
  }
  const restoreProd = async (id: number) => {
    try {
      await restoreProductRemote(id)
      setProducts((current) =>
        current.map((product) =>
          product.id === id ? { ...product, isActive: true } : product,
        ),
      )
      setAdminNotice("Product restored to the customer storefront.")
    } catch (error) {
      console.error("Unable to restore product in Supabase.", error)
      setAdminNotice(
        error instanceof Error ? error.message : "Unable to restore product.",
      )
    }
  }
  const resetProductForm = () => {
    setNewProd(EMPTY_PRODUCT_DRAFT)
    setNewProdImage("")
    setNewProdImageName("")
    setAddError("")
    setEditingProductId(null)
    setShowAdd(false)
  }
  const openProductForm = (product?: ManagedProduct) => {
    if (product) {
      setEditingProductId(product.id)
      setNewProd({
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        type: product.type,
        gender: product.gender,
        price: String(product.price),
        originalPrice:
          product.originalPrice === null ? "" : String(product.originalPrice),
        stock: String(product.stock),
        rating: String(product.rating),
        reviews: String(product.reviews),
        colors: product.colors.join(", "),
        sizes: product.sizes.join(", "),
        badge: product.badge || "",
        badgeColor: product.badgeColor || "Blue",
        isNew: product.isNew,
        isSale: product.isSale,
      })
      setNewProdImage(product.image || "")
      setNewProdImageName(product.image ? "Current product photo" : "")
    } else {
      setEditingProductId(null)
      setNewProd(EMPTY_PRODUCT_DRAFT)
      setNewProdImage("")
      setNewProdImageName("")
    }
    setAddError("")
    setShowAdd(true)
  }
  const chooseProductImage = async (file?: File) => {
    if (!file) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setAddError("Choose a PNG, JPG, or WebP image.")
      return
    }
    setIsProcessingProductImage(true)
    setAddError("")
    try {
      const compressedImage = await compressProductImage(file)
      setNewProdImage(compressedImage)
      setNewProdImageName(file.name)
    } catch (error) {
      console.error("Unable to process the selected product photo.", error)
      setAddError(
        error instanceof Error
          ? error.message
          : "The selected photo could not be processed.",
      )
    } finally {
      setIsProcessingProductImage(false)
    }
  }

  const handleProductImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    void chooseProductImage(file)
  }

  const updateOrder = async (id: string, status: OrderStatus) => {
    try {
      await setOrderStatusRemote(id, status)
      const next = orders.map((order) =>
        order.id === id
          ? {
              ...order,
              status,
              payment: status === "Delivered" ? "Paid" : order.payment,
            }
          : order,
      )
      setOrders(next)
      setSelectedOrder((current) =>
        current?.id === id
          ? next.find((order) => order.id === id) || null
          : current,
      )
    } catch (error) {
      console.error("Unable to update order in Supabase.", error)
      setAdminNotice(
        error instanceof Error ? error.message : "Unable to update order.",
      )
    }
  }

  const exportCustomers = () => {
    const rows = [
      ["Name", "Email", "Member Since", "Orders", "Total Spent", "Tier"],
      ...filtCust.map((customer) => [
        customer.name,
        customer.email,
        customer.joined,
        customer.orders,
        customer.spent,
        customer.status,
      ]),
    ]
    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n")
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "nelzcollections-customers.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const resetPromoForm = () => {
    setPromoDraft({
      code: "",
      type: "Percentage",
      value: "",
      minOrder: "",
      limit: "",
      expires: "",
      status: "Active",
    })
    setEditingPromoId(null)
    setPromoError("")
    setShowPromoForm(false)
  }
  const openPromoForm = (promo?: ManagedPromotion) => {
    setEditingPromoId(promo?.id || null)
    setPromoDraft(
      promo
        ? {
            code: promo.code,
            type: promo.type,
            value: promo.value,
            minOrder: String(promo.minOrder),
            limit: promo.limit === null ? "" : String(promo.limit),
            expires:
              promo.expires === "No expiry"
                ? ""
                : new Date(promo.expires).toISOString().slice(0, 10),
            status: promo.status,
          }
        : {
            code: "",
            type: "Percentage",
            value: "",
            minOrder: "",
            limit: "",
            expires: "",
            status: "Active",
          },
    )
    setPromoError("")
    setShowPromoForm(true)
  }
  const savePromo = async () => {
    if (
      !promoDraft.code.trim() ||
      (promoDraft.type !== "Free Shipping" && !promoDraft.value.trim())
    ) {
      setPromoError(
        promoDraft.type === "Free Shipping"
          ? "A promotion code is required."
          : "A promotion code and discount value are required.",
      )
      return
    }
    const code = promoDraft.code.trim().toUpperCase()
    if (
      managedPromotions.some(
        (promo) => promo.code === code && promo.id !== editingPromoId,
      )
    ) {
      setPromoError("That promotion code already exists.")
      return
    }
    const minOrder = promoDraft.minOrder.trim()
      ? Number(promoDraft.minOrder)
      : 0
    const limit = promoDraft.limit.trim() ? Number(promoDraft.limit) : null
    const promotionValue =
      promoDraft.type === "Free Shipping"
        ? 0
        : Number.parseFloat(promoDraft.value.replace(/[^\d.]/g, ""))
    if (
      !Number.isFinite(minOrder) ||
      minOrder < 0 ||
      (limit !== null && (!Number.isInteger(limit) || limit < 1)) ||
      !Number.isFinite(promotionValue) ||
      promotionValue < 0 ||
      (promoDraft.type === "Percentage" && promotionValue > 100) ||
      (promoDraft.type !== "Free Shipping" && promotionValue === 0)
    ) {
      setPromoError(
        "Enter a valid discount, minimum order, and positive whole-number usage limit. Percentage discounts cannot exceed 100%.",
      )
      return
    }
    const existing = managedPromotions.find(
      (promo) => promo.id === editingPromoId,
    )
    const saved: ManagedPromotion = {
      id: editingPromoId ?? 0,
      code,
      type: promoDraft.type,
      value: promoDraft.value.trim(),
      minOrder,
      uses: existing?.uses || 0,
      limit,
      expires: promoDraft.expires.trim() || "No expiry",
      status: promoDraft.status,
    }
    try {
      const savedPromotion = await savePromotionRemote(saved)
      setManagedPromotions((current) =>
        editingPromoId
          ? current.map((promo) =>
              promo.id === editingPromoId ? savedPromotion : promo,
            )
          : [savedPromotion, ...current],
      )
      setAdminNotice("Promotion saved to Supabase.")
      resetPromoForm()
    } catch (error) {
      console.error("Unable to save promotion to Supabase.", error)
      setPromoError(
        error instanceof Error ? error.message : "Unable to save promotion.",
      )
    }
  }
  const deletePromo = async (id: number) => {
    if (!window.confirm("Delete this promotion?")) return
    try {
      await deletePromotionRemote(id)
      setManagedPromotions((current) =>
        current.filter((promo) => promo.id !== id),
      )
      setAdminNotice("Promotion deleted from Supabase.")
    } catch (error) {
      console.error("Unable to delete promotion from Supabase.", error)
      setAdminNotice(
        error instanceof Error ? error.message : "Unable to delete promotion.",
      )
    }
  }

  const filtProd = products.filter(
    (p) =>
      p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(prodSearch.toLowerCase()),
  )
  const filtOrders = orders.filter((o) => {
    const ms =
      o.customer.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.id.includes(orderSearch)
    const mf = orderFilter === "All" || o.status === orderFilter
    return ms && mf
  })
  const filtCust = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(custSearch.toLowerCase()),
  )

  return (
    <div
      className="dashboard-shell admin-dashboard"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <AdminSidebar
        section={section}
        onSectionChange={setSection}
        onViewChange={onViewChange}
      />

      {/* Main */}
      <main
        className="admin-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <AdminTopBar
          section={section}
          orders={orders}
          onNotice={setAdminNotice}
        />

        <div
          className="admin-content"
          style={{ flex: 1, padding: "28px 36px", overflowY: "auto" }}
        >
          {isLoadingData && (
            <p role="status" style={{ color: "#64748b", fontSize: 13 }}>
              Loading products, orders, and promotions from Supabase...
            </p>
          )}
          {adminNotice && (
            <div
              role="status"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
                padding: "11px 14px",
                border: "1px solid #bfdbfe",
                borderRadius: 9,
                color: "#1d4ed8",
                background: "#eff6ff",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {adminNotice}
              <button
                onClick={() => setAdminNotice("")}
                aria-label="Dismiss message"
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#1d4ed8",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* ── Overview ── */}
          {section === "overview" && (
            <div className="fade-in">
              <div
                className="dashboard-stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "18px 20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          minWidth: 38,
                          height: 38,
                          padding: "0 8px",
                          background: kpi.color,
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 800,
                          color: DARK,
                        }}
                      >
                        {kpi.icon}
                      </div>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "#64748b",
                        }}
                      >
                        Live data
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "Plus Jakarta Sans, sans-serif",
                        fontSize: 22,
                        fontWeight: 800,
                        color: DARK,
                        marginBottom: 2,
                      }}
                    >
                      {kpi.value}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>
                      {kpi.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent orders table */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 24px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontSize: 15,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    Recent Orders
                  </h3>
                  <button
                    onClick={() => setSection("orders")}
                    style={{
                      fontSize: 12.5,
                      color: ACCENT,
                      fontWeight: 700,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    View all →
                  </button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {[
                        "Order",
                        "Customer",
                        "Date",
                        "Total",
                        "Status",
                        "Payment",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "10px 16px",
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((o) => (
                      <tr
                        key={o.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8fafc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        style={{ transition: "background 0.15s" }}
                      >
                        <td
                          style={{
                            padding: "11px 16px",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 12.5,
                            color: ACCENT,
                            fontWeight: 600,
                          }}
                        >
                          {o.id}
                        </td>
                        <td
                          style={{
                            padding: "11px 16px",
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: DARK,
                          }}
                        >
                          {o.customer}
                        </td>
                        <td
                          style={{
                            padding: "11px 16px",
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          {o.date}
                        </td>
                        <td
                          style={{
                            padding: "11px 16px",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 13.5,
                            fontWeight: 800,
                          }}
                        >
                          KSh{o.total.toFixed(2)}
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              color: ORDER_STATUS_COLORS[o.status],
                              background: `${ORDER_STATUS_COLORS[o.status]}18`,
                              padding: "3px 10px",
                              borderRadius: 10,
                            }}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color:
                                o.payment === "Paid" ? "#16a34a" : "#dc2626",
                              background:
                                o.payment === "Paid" ? "#dcfce7" : "#fee2e2",
                              padding: "3px 10px",
                              borderRadius: 10,
                            }}
                          >
                            {o.payment}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            padding: "36px 20px",
                            textAlign: "center",
                            color: "#94a3b8",
                            fontSize: 13.5,
                          }}
                        >
                          No orders yet. New checkout orders will appear here
                          automatically.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Products ── */}
          {section === "products" && (
            <div className="fade-in">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                  />
                  <input
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    placeholder="Search by name or SKU…"
                    style={{
                      padding: "8px 12px 8px 34px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 13.5,
                      outline: "none",
                      width: 300,
                      background: "#fff",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = ACCENT)}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
                <button
                  onClick={() => openProductForm()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 18px",
                    background: ACCENT,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={15} /> Add Product
                </button>
              </div>

              {showAdd && (
                <div
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${ACCENT}`,
                    borderRadius: 12,
                    padding: "20px 24px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "Plus Jakarta Sans, sans-serif",
                        fontSize: 15,
                        fontWeight: 800,
                        margin: 0,
                      }}
                    >
                      {editingProductId ? "Edit Product" : "New Product"}
                    </h3>
                    <button
                      onClick={resetProductForm}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <X size={18} color="#94a3b8" />
                    </button>
                  </div>
                  <div
                    className="admin-product-form"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(6, 1fr)",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    {([
                      {
                        key: "name",
                        label: "Product Name",
                        ph: "e.g. Silk Midi Dress",
                      },
                      { key: "brand", label: "Brand", ph: "e.g. Arket" },
                      { key: "sku", label: "SKU", ph: "ARK-SMD-BLK" },
                      { key: "price", label: "Price (KSh)", ph: "0.00" },
                      {
                        key: "originalPrice",
                        label: "Original Price (optional)",
                        ph: "0.00",
                      },
                      { key: "stock", label: "Stock", ph: "0" },
                      { key: "rating", label: "Rating (0–5)", ph: "0" },
                      { key: "reviews", label: "Review Count", ph: "0" },
                      {
                        key: "colors",
                        label: "Colors (comma-separated)",
                        ph: "Black, White, Blue, Maroon",
                      },
                      {
                        key: "sizes",
                        label: "Sizes (comma-separated)",
                        ph: "S, M, L",
                      },
                      { key: "badge", label: "Badge (optional)", ph: "New" },
                      {
                        key: "badgeColor",
                        label: "Badge Color",
                        ph: "Blue",
                      },
                    ] satisfies {
                      key: "name" | "brand" | "sku" | "price" | "originalPrice" | "stock" | "rating" | "reviews" | "colors" | "sizes" | "badge" | "badgeColor"
                      label: string
                      ph: string
                    }[]).map((f) => (
                      <div
                        key={f.key}
                        style={{
                          gridColumn:
                            f.key === "name" ||
                            f.key === "colors" ||
                            f.key === "sizes"
                              ? "span 2"
                              : undefined,
                        }}
                      >
                        <label
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#64748b",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          {f.label}
                        </label>
                        <input
                          value={newProd[f.key]}
                          onChange={(e) =>
                            setNewProd((p) => ({
                              ...p,
                              [f.key]: e.target.value,
                            }))
                          }
                          type={
                            [
                              "price",
                              "originalPrice",
                              "stock",
                              "rating",
                              "reviews",
                            ].includes(f.key)
                              ? "number"
                              : "text"
                          }
                          min={
                            ["price", "originalPrice"].includes(f.key)
                              ? "0.01"
                              : "0"
                          }
                          step={f.key === "rating" ? "0.1" : "any"}
                          placeholder={f.ph}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            fontSize: 13.5,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = ACCENT)}
                          onBlur={(e) =>
                            (e.target.style.borderColor = "#e2e8f0")
                          }
                        />
                      </div>
                    ))}
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#64748b",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Type
                      </label>
                      <select
                        value={newProd.type}
                        onChange={(e) =>
                          setNewProd((p) => ({
                            ...p,
                            type: e.target.value as ProductDraft["type"],
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 13.5,
                          outline: "none",
                          background: "#fff",
                          boxSizing: "border-box",
                        }}
                      >
                        {["Clothing", "Shoes", "Bags", "Accessories"].map(
                          (t) => (
                            <option key={t}>{t}</option>
                          ),
                        )}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#64748b",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Gender
                      </label>
                      <select
                        value={newProd.gender}
                        onChange={(event) =>
                          setNewProd((product) => ({
                            ...product,
                            gender: event.target
                              .value as ProductDraft["gender"],
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 13.5,
                          outline: "none",
                          background: "#fff",
                          boxSizing: "border-box",
                        }}
                      >
                        {["Men", "Women", "Kids", "Unisex"].map((gender) => (
                          <option key={gender}>{gender}</option>
                        ))}
                      </select>
                    </div>
                    {([
                      ["isNew", "Show in New Arrivals", newProd.isNew],
                      ["isSale", "Show in Sale", newProd.isSale],
                    ] as const).map(([key, label, checked]) => (
                      <label
                        key={String(key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "#475569",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checked)}
                          onChange={(event) =>
                            setNewProd((product) => ({
                              ...product,
                              [key]: event.target.checked,
                            }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div
                    className="admin-image-upload"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: 14,
                      marginBottom: 14,
                      border: "1.5px dashed #cbd5e1",
                      borderRadius: 10,
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        width: 76,
                        height: 76,
                        flexShrink: 0,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {newProdImage ? (
                        <img
                          src={newProdImage}
                          alt="Product preview"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <Package size={24} color="#94a3b8" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label
                        htmlFor="product-photo"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          padding: "9px 14px",
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          color: DARK,
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={14} />
                        {newProdImage
                          ? "Change product photo"
                          : "Choose product photo"}
                      </label>
                      <input
                        id="product-photo"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={isProcessingProductImage}
                        onChange={handleProductImageChange}
                        style={{
                          position: "absolute",
                          width: 1,
                          height: 1,
                          opacity: 0,
                          pointerEvents: "none",
                        }}
                      />
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: "#64748b",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isProcessingProductImage
                          ? "Optimizing photo for safe storage…"
                          : newProdImageName ||
                            "PNG, JPG or WebP. Your browser will ask you to choose a file from this device."}
                      </div>
                    </div>
                  </div>
                  {addError && (
                    <p
                      role="alert"
                      style={{
                        margin: "0 0 12px",
                        color: "#dc2626",
                        fontSize: 12.5,
                        fontWeight: 700,
                      }}
                    >
                      {addError}
                    </p>
                  )}
                  <button
                    onClick={saveProduct}
                    disabled={isProcessingProductImage}
                    style={{
                      padding: "9px 22px",
                      background: isProcessingProductImage ? "#94a3b8" : ACCENT,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: isProcessingProductImage ? "wait" : "pointer",
                    }}
                  >
                    {isProcessingProductImage
                      ? "Processing photo…"
                      : editingProductId
                        ? "Save Changes"
                        : "Add Product"}
                  </button>
                </div>
              )}

              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {[
                        "Product",
                        "Brand",
                        "SKU",
                        "Type",
                        "Gender",
                        "Price",
                        "Stock",
                        "Stock Status",
                        "Visibility",
                        "Sales",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "10px 14px",
                            fontSize: 10.5,
                            fontWeight: 800,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            borderBottom: "1px solid #e2e8f0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtProd.map((p) => {
                      const inv = getInventoryStatus(p.stock)
                      return (
                        <tr
                          key={p.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f8fafc")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            transition: "background 0.15s",
                          }}
                        >
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: DARK,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                minWidth: 180,
                              }}
                            >
                              <div
                                style={{
                                  width: 36,
                                  height: 42,
                                  borderRadius: 6,
                                  overflow: "hidden",
                                  background: "#f1f5f9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt=""
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <Package size={14} color="#94a3b8" />
                                )}
                              </div>
                              {p.name}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              color: "#64748b",
                            }}
                          >
                            {p.brand}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 11.5,
                              color: "#94a3b8",
                            }}
                          >
                            {p.sku}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              color: "#64748b",
                            }}
                          >
                            {p.type}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontSize: 13,
                              color: "#64748b",
                            }}
                          >
                            {p.gender}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 13.5,
                              fontWeight: 800,
                            }}
                          >
                            KSh{p.price.toFixed(2)}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 13.5,
                            }}
                          >
                            {p.stock}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 800,
                                color: inv.color,
                                background: inv.bg,
                                padding: "3px 10px",
                                borderRadius: 10,
                              }}
                            >
                              {inv.label}
                            </span>
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 800,
                                color: p.isActive ? "#15803d" : "#64748b",
                                background: p.isActive ? "#dcfce7" : "#f1f5f9",
                                padding: "3px 10px",
                                borderRadius: 10,
                              }}
                            >
                              {p.isActive ? "Visible" : "Hidden"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 13,
                            }}
                          >
                            {p.sales.toLocaleString()}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => openProductForm(p)}
                                aria-label={`Edit ${p.name}`}
                                style={{
                                  width: 30,
                                  height: 30,
                                  background: "#dbeafe",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Edit2 size={13} color={ACCENT} />
                              </button>
                              <button
                                onClick={() =>
                                  p.isActive
                                    ? void deleteProd(p.id)
                                    : void restoreProd(p.id)
                                }
                                aria-label={
                                  p.isActive
                                    ? `Hide ${p.name} from storefront`
                                    : `Restore ${p.name} to storefront`
                                }
                                title={
                                  p.isActive
                                    ? "Hide product"
                                    : "Restore product"
                                }
                                style={{
                                  width: 30,
                                  height: 30,
                                  background: p.isActive
                                    ? "#fee2e2"
                                    : "#dcfce7",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {p.isActive ? (
                                  <Trash2 size={13} color="#dc2626" />
                                ) : (
                                  <Eye size={13} color="#15803d" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Inventory ── */}
          {section === "inventory" && <InventorySection products={products} />}

          {/* ── Analytics ── */}
          {section === "analytics" && (
            <AnalyticsSection orders={orders} products={products} />
          )}

          {/* ── Customers ── */}
          {section === "customers" && (
            <div className="fade-in">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div style={{ position: "relative" }}>
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                  />
                  <input
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    placeholder="Search customers…"
                    style={{
                      padding: "8px 12px 8px 34px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 13.5,
                      outline: "none",
                      width: 300,
                      background: "#fff",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = ACCENT)}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
                <button
                  onClick={exportCustomers}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#475569",
                    cursor: "pointer",
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {[
                        "Customer",
                        "Email",
                        "Member Since",
                        "Orders",
                        "Total Spent",
                        "Tier",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "10px 16px",
                            fontSize: 10.5,
                            fontWeight: 800,
                            color: "#94a3b8",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtCust.map((c) => (
                      <tr
                        key={c.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8fafc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s",
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                background: "#dbeafe",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                fontWeight: 800,
                                color: ACCENT,
                                flexShrink: 0,
                              }}
                            >
                              {c.name.charAt(0)}
                            </div>
                            <span
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: DARK,
                              }}
                            >
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          {c.email}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "#64748b",
                          }}
                        >
                          {c.joined}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 13.5,
                            fontWeight: 700,
                          }}
                        >
                          {c.orders}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 13.5,
                            fontWeight: 800,
                          }}
                        >
                          KSh{c.spent.toFixed(2)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              color: c.status === "VIP" ? "#7c3aed" : "#16a34a",
                              background:
                                c.status === "VIP" ? "#ede9fe" : "#dcfce7",
                              padding: "3px 10px",
                              borderRadius: 10,
                            }}
                          >
                            {c.status === "VIP" ? "✦ VIP" : "Active"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            style={{
                              padding: "5px 12px",
                              background: "#f1f5f9",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 12.5,
                              fontWeight: 700,
                              color: "#475569",
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filtCust.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: "36px 20px",
                            textAlign: "center",
                            color: "#94a3b8",
                            fontSize: 13.5,
                          }}
                        >
                          {custSearch
                            ? "No customers match your search."
                            : "Customers will appear here after they place an order."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Orders ── */}
          {section === "orders" && (
            <div className="fade-in">
              <div
                className="admin-order-toolbar"
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 20,
                  flexWrap: "wrap",
                }}
              >
                <div
                  className="admin-order-search"
                  style={{
                    position: "relative",
                    flex: "1 1 280px",
                    maxWidth: 320,
                  }}
                >
                  <Search
                    size={14}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                  />
                  <input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search orders or customers…"
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 34px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 13.5,
                      outline: "none",
                      background: "#fff",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = ACCENT)}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    "All",
                    "Pending",
                    "Processing",
                    "Shipped",
                    "Delivered",
                    "Cancelled",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setOrderFilter(s)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 20,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12.5,
                        fontWeight: 700,
                        background: orderFilter === s ? ACCENT : "#f1f5f9",
                        color: orderFilter === s ? "#fff" : "#64748b",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {filtOrders.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "16px 22px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 16 }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: ACCENT,
                          }}
                        >
                          {o.id}
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          {o.date} · {o.items} item{o.items > 1 ? "s" : ""}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: DARK,
                          }}
                        >
                          {o.customer}
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          {o.email}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            marginTop: 2,
                          }}
                        >
                          {o.phone || "No phone provided"}
                        </div>
                        {o.lineItems && o.lineItems.length > 0 && (
                          <div
                            style={{
                              marginTop: 6,
                              color: "#334155",
                              fontSize: 12,
                              lineHeight: 1.5,
                            }}
                          >
                            {o.lineItems.map((item, index) => (
                              <div key={`${item.productId}-${index}`}>
                                {item.name} × {item.quantity}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 16,
                          fontWeight: 800,
                          color: DARK,
                        }}
                      >
                        KSh{o.total.toFixed(2)}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: ORDER_STATUS_COLORS[o.status],
                          background: `${ORDER_STATUS_COLORS[o.status]}18`,
                          padding: "4px 12px",
                          borderRadius: 10,
                        }}
                      >
                        {o.status}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: o.payment === "Paid" ? "#16a34a" : "#dc2626",
                          background:
                            o.payment === "Paid" ? "#dcfce7" : "#fee2e2",
                          padding: "4px 12px",
                          borderRadius: 10,
                        }}
                      >
                        {o.payment}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setSelectedOrder(o)}
                          style={{
                            padding: "5px 12px",
                            background: "#f1f5f9",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: "#475569",
                          }}
                        >
                          View
                        </button>
                        {o.status === "Processing" && (
                          <button
                            onClick={() => updateOrder(o.id, "Shipped")}
                            style={{
                              padding: "5px 12px",
                              background: "#ede9fe",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 12.5,
                              fontWeight: 800,
                              color: "#7c3aed",
                            }}
                          >
                            Ship
                          </button>
                        )}
                        {o.status === "Shipped" && (
                          <button
                            onClick={() => updateOrder(o.id, "Delivered")}
                            style={{
                              padding: "5px 12px",
                              background: "#dcfce7",
                              border: "none",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 12.5,
                              fontWeight: 800,
                              color: "#15803d",
                            }}
                          >
                            Deliver
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filtOrders.length === 0 && (
                  <div
                    role="status"
                    style={{
                      padding: "28px 20px",
                      background: "#fff",
                      border: "1px dashed #cbd5e1",
                      borderRadius: 12,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: DARK }}>
                      {orders.length === 0
                        ? "No orders yet"
                        : "No orders match your search or filter"}
                    </div>
                    <div
                      style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}
                    >
                      {orders.length === 0
                        ? "Orders placed by customers will appear here."
                        : "Try changing your search or status filter."}
                    </div>
                    {orders.length > 0 &&
                      (orderSearch || orderFilter !== "All") && (
                        <button
                          onClick={() => {
                            setOrderSearch("")
                            setOrderFilter("All")
                          }}
                          style={{
                            marginTop: 12,
                            padding: "7px 12px",
                            background: "#eff6ff",
                            border: "none",
                            borderRadius: 7,
                            cursor: "pointer",
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: ACCENT,
                          }}
                        >
                          Clear search and filters
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Promotions ── */}
          {section === "promotions" && (
            <div className="fade-in">
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 20,
                }}
              >
                <button
                  onClick={() => openPromoForm()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 18px",
                    background: ACCENT,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={15} /> Create Promo
                </button>
              </div>

              {showPromoForm && (
                <div
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${ACCENT}`,
                    borderRadius: 12,
                    padding: "20px 24px",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                      {editingPromoId ? "Edit Promotion" : "Create Promotion"}
                    </h3>
                    <button
                      onClick={resetPromoForm}
                      aria-label="Close promotion form"
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "#64748b",
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div
                    className="admin-promo-form"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    {([
                      {
                        key: "code",
                        label: "Promo Code",
                        placeholder: "SAVE20",
                      },
                      {
                        key: "value",
                        label: "Discount Value",
                        placeholder: "20% or KSh 500",
                      },
                      {
                        key: "minOrder",
                        label: "Minimum Order (KSh)",
                        placeholder: "0",
                      },
                      {
                        key: "limit",
                        label: "Usage Limit",
                        placeholder: "Unlimited",
                      },
                      {
                        key: "expires",
                        label: "Expiry Date (optional)",
                        placeholder: "Leave blank for no expiry",
                      },
                    ] satisfies {
                      key: "code" | "value" | "minOrder" | "limit" | "expires"
                      label: string
                      placeholder: string
                    }[]).map((field) => (
                      <label
                        key={field.key}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#64748b",
                        }}
                      >
                        {field.label}
                        <input
                          value={
                            promoDraft[(field.key as keyof typeof promoDraft)]
                          }
                          onChange={(event) =>
                            setPromoDraft((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          type={field.key === "expires" ? "date" : "text"}
                          placeholder={field.placeholder}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            fontSize: 13,
                            outline: "none",
                          }}
                        />
                      </label>
                    ))}
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#64748b",
                      }}
                    >
                      Discount Type
                      <select
                        value={promoDraft.type}
                        onChange={(event) =>
                          setPromoDraft((current) => ({
                            ...current,
                            type: event.target.value as PromotionType,
                          }))
                        }
                        style={{
                          padding: "8px 10px",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          background: "#fff",
                          fontSize: 13,
                        }}
                      >
                        <option>Percentage</option>
                        <option>Fixed Amount</option>
                        <option>Free Shipping</option>
                      </select>
                    </label>
                    <label
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#64748b",
                      }}
                    >
                      Status
                      <select
                        value={promoDraft.status}
                        onChange={(event) =>
                          setPromoDraft((current) => ({
                            ...current,
                            status: event.target.value as PromotionStatus,
                          }))
                        }
                        style={{
                          padding: "8px 10px",
                          border: "1px solid #e2e8f0",
                          borderRadius: 8,
                          background: "#fff",
                          fontSize: 13,
                        }}
                      >
                        <option>Active</option>
                        <option>Expiring</option>
                        <option>Expired</option>
                      </select>
                    </label>
                  </div>
                  {promoError && (
                    <p
                      role="alert"
                      style={{
                        margin: "12px 0 0",
                        color: "#dc2626",
                        fontSize: 12.5,
                        fontWeight: 700,
                      }}
                    >
                      {promoError}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button
                      onClick={savePromo}
                      style={{
                        padding: "9px 18px",
                        border: "none",
                        borderRadius: 8,
                        background: ACCENT,
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {editingPromoId ? "Save Changes" : "Create Promo"}
                    </button>
                    <button
                      onClick={resetPromoForm}
                      style={{
                        padding: "9px 18px",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        background: "#fff",
                        color: "#475569",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div
                className="promotion-stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {[
                  {
                    label: "Active Promos",
                    value: managedPromotions.filter(
                      (p) => p.status === "Active",
                    ).length,
                    accent: "#059669",
                    bg: "#d1fae5",
                  },
                  {
                    label: "Total Uses",
                    value: managedPromotions
                      .reduce((s, p) => s + p.uses, 0)
                      .toLocaleString(),
                    accent: ACCENT,
                    bg: "#dbeafe",
                  },
                  {
                    label: "Expiring Soon",
                    value: managedPromotions.filter(
                      (p) => p.status === "Expiring",
                    ).length,
                    accent: "#d97706",
                    bg: "#fef3c7",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      padding: "18px 22px",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "Plus Jakarta Sans, sans-serif",
                        fontSize: 30,
                        fontWeight: 800,
                        color: DARK,
                        marginBottom: 4,
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: s.accent }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {managedPromotions.map((promo) => {
                  const st =
                    promo.status === "Active"
                      ? { color: "#16a34a", bg: "#dcfce7" }
                      : promo.status === "Expiring"
                        ? { color: "#d97706", bg: "#fef3c7" }
                        : { color: "#dc2626", bg: "#fee2e2" }
                  return (
                    <div
                      key={promo.id}
                      className="promotion-card"
                      style={{
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: "16px 22px",
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                        opacity: promo.status === "Expired" ? 0.55 : 1,
                      }}
                    >
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: 8,
                          padding: "10px 18px",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 16,
                          fontWeight: 800,
                          color: DARK,
                          letterSpacing: "0.06em",
                          flexShrink: 0,
                        }}
                      >
                        {promo.code}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: DARK,
                            }}
                          >
                            {promo.type}
                          </span>
                          <span
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 15,
                              fontWeight: 800,
                              color: ACCENT,
                            }}
                          >
                            {promo.type === "Free Shipping"
                              ? "Free delivery"
                              : `${promo.value} off`}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          Min. KSh{promo.minOrder} ·{" "}
                          {promo.uses.toLocaleString()} uses
                          {promo.limit
                            ? ` / ${promo.limit.toLocaleString()}`
                            : ""}{" "}
                          · Expires {formatPromotionExpiry(promo.expires)}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: st.color,
                          background: st.bg,
                          padding: "4px 12px",
                          borderRadius: 10,
                        }}
                      >
                        {promo.status}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openPromoForm(promo)}
                          aria-label={`Edit ${promo.code}`}
                          style={{
                            width: 30,
                            height: 30,
                            background: "#dbeafe",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Edit2 size={13} color={ACCENT} />
                        </button>
                        <button
                          onClick={() => deletePromo(promo.id)}
                          aria-label={`Delete ${promo.code}`}
                          style={{
                            width: 30,
                            height: 30,
                            background: "#fee2e2",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={13} color="#dc2626" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {(selectedOrder || selectedCustomer) && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <button
            aria-label="Close details"
            onClick={() => {
              setSelectedOrder(null)
              setSelectedCustomer(null)
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
              background: "rgba(15,23,42,0.5)",
              cursor: "pointer",
            }}
          />
          <div
            style={{
              position: "relative",
              width: "min(100%, 460px)",
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 24px 70px rgba(15,23,42,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                {selectedOrder ? "Order Details" : "Customer Details"}
              </h2>
              <button
                onClick={() => {
                  setSelectedOrder(null)
                  setSelectedCustomer(null)
                }}
                aria-label="Close details"
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: 8,
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={18} />
              </button>
            </div>
            {selectedOrder && (
              <>
                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    ["Order", selectedOrder.id],
                    ["Customer", selectedOrder.customer],
                    ["Email", selectedOrder.email],
                    ["Phone", selectedOrder.phone || "Not provided"],
                    ["Date", selectedOrder.date],
                    ["Items", String(selectedOrder.items)],
                    ["Total", `KSh ${selectedOrder.total.toFixed(2)}`],
                    ["Status", selectedOrder.status],
                    ["Payment", selectedOrder.payment],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 20,
                        paddingBottom: 10,
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "#64748b", fontWeight: 700 }}>
                        {label}
                      </span>
                      <span
                        style={{
                          color: DARK,
                          fontWeight: 800,
                          textAlign: "right",
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                {selectedOrder.lineItems &&
                  selectedOrder.lineItems.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <h3 style={{ margin: "0 0 10px", fontSize: 13 }}>
                        Ordered items
                      </h3>
                      {selectedOrder.lineItems.map((item, index) => (
                        <div
                          key={`${item.productId}-${index}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "9px 0",
                            borderTop: "1px solid #f1f5f9",
                            color: "#475569",
                            fontSize: 12.5,
                          }}
                        >
                          <span>
                            {item.name} × {item.quantity}
                          </span>
                          <span style={{ fontWeight: 700 }}>
                            KSh {(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                {selectedOrder.status === "Pending" && (
                  <button
                    onClick={() =>
                      void updateOrder(selectedOrder.id, "Processing")
                    }
                    style={{
                      width: "100%",
                      marginTop: 18,
                      padding: "11px 14px",
                      border: "none",
                      borderRadius: 8,
                      background: ACCENT,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Start Fulfillment
                  </button>
                )}
              </>
            )}
            {selectedCustomer && (
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  ["Name", selectedCustomer.name],
                  ["Email", selectedCustomer.email],
                  ["Member Since", selectedCustomer.joined],
                  ["Orders", String(selectedCustomer.orders)],
                  ["Total Spent", `KSh ${selectedCustomer.spent.toFixed(2)}`],
                  ["Tier", selectedCustomer.status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 20,
                      paddingBottom: 10,
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "#64748b", fontWeight: 700 }}>
                      {label}
                    </span>
                    <span
                      style={{
                        color: DARK,
                        fontWeight: 800,
                        textAlign: "right",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
