import { useEffect, useRef, useState } from "react"
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Star,
  X,
  ArrowRight,
  Truck,
  Shield,
  RefreshCw,
  Package,
  Grid2X2,
  LayoutList,
  Menu,
} from "lucide-react"
import { navCategories } from "../data/mockData"
import type { Product } from "../data/mockData"
import { loadCustomerProfile, saveCustomerProfile } from "../data/localStore"
import { generateUuid } from "../lib/uuid"
import {
  fetchAvailablePromotions,
  fetchProducts,
  placeOrderRemote,
  validatePromotionRemote,
} from "../data/supabaseStore"
import type { StorefrontPromotion } from "../data/supabaseStore"

interface CartItem extends Product {
  qty: number
  selectedColor: string
  selectedSize: string
}

interface LandingProps {
  onViewChange: (view: string) => void
}

const ACCENT = "#2563eb"
const DARK = "#0f172a"

const describePromotion = (promotion: StorefrontPromotion) =>
  promotion.type === "percentage"
    ? `${promotion.value}% off`
    : promotion.type === "fixed_amount"
      ? `KSh ${promotion.value.toFixed(2)} off`
      : "free delivery"

const getCustomerOrderToken = () => {
  const key = "nelz-customer-order-access"
  const existing = localStorage.getItem(key)
  if (existing && existing.length >= 32) return existing
  const token = `${generateUuid()}${generateUuid()}`
  localStorage.setItem(key, token)
  return token
}

const getSavedCheckoutDetails = (): Record<string, string> => {
  const customer = loadCustomerProfile()
  if (!customer) return {}
  return {
    "Full Name": customer.name,
    Email: customer.email,
    Phone: customer.phone,
    Address: customer.address,
    City: customer.city,
    Postcode: customer.postcode,
  }
}

export default function Landing({ onViewChange }: LandingProps) {
  const [search, setSearch] = useState("")
  const [activeCat, setActiveCat] = useState("all")
  const [sortBy, setSortBy] = useState("featured")
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "checkout">("cart")
  const [cart, setCart] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<number[]>([2, 8])
  const [quickView, setQuickView] = useState<Product | null>(null)
  const [zoomedProductPhoto, setZoomedProductPhoto] = useState<string | null>(
    null,
  )
  const [quickViewColor, setQuickViewColor] = useState("")
  const [quickViewSize, setQuickViewSize] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const [gridView, setGridView] = useState<2 | 3 | 4>(3)
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768,
  )
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [checkoutDetails, setCheckoutDetails] =
    useState<Record<string, string>>(getSavedCheckoutDetails)
  const [checkoutError, setCheckoutError] = useState("")
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [storeProducts, setStoreProducts] = useState<Product[]>([])
  const [storeLoadError, setStoreLoadError] = useState("")
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [promotionInput, setPromotionInput] = useState("")
  const [appliedPromotion, setAppliedPromotion] = useState<{
    code: string
    discount: number
    discountType: StorefrontPromotion["type"]
  } | null>(null)
  const [promotionError, setPromotionError] = useState("")
  const [isValidatingPromotion, setIsValidatingPromotion] = useState(false)
  const [availablePromotions, setAvailablePromotions] =
    useState<StorefrontPromotion[]>([])
  const [promotionLoadError, setPromotionLoadError] = useState("")
  const [arePromotionsLoading, setArePromotionsLoading] = useState(true)

  useEffect(() => {
    let active = true
    void fetchProducts()
      .then((products) => {
        if (!active) return
        setStoreProducts(
          products.map(
            ({ sku: _sku, status: _status, sales: _sales, ...product }) =>
              product,
          ),
        )
        setStoreLoadError("")
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error("Unable to load products from Supabase.", error)
        setStoreLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load products. Please refresh and try again.",
        )
      })
      .finally(() => {
        if (active) setIsLoadingProducts(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchAvailablePromotions()
      .then((promotions) => {
        if (!active) return
        setAvailablePromotions(promotions)
        setPromotionLoadError("")
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error("Unable to load storefront promotions.", error)
        setPromotionLoadError(
          error instanceof Error
            ? error.message
            : "Available promotions could not be loaded.",
        )
      })
      .finally(() => {
        if (active) setArePromotionsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!quickView) return

    const scrollY = window.scrollY
    const bodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    }
    const rootOverflow = document.documentElement.style.overflow

    document.documentElement.style.overflow = "hidden"
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = "0"
    document.body.style.right = "0"
    document.body.style.width = "100%"
    document.body.style.overflow = "hidden"

    return () => {
      document.documentElement.style.overflow = rootOverflow
      document.body.style.position = bodyStyles.position
      document.body.style.top = bodyStyles.top
      document.body.style.left = bodyStyles.left
      document.body.style.right = bodyStyles.right
      document.body.style.width = bodyStyles.width
      document.body.style.overflow = bodyStyles.overflow
      window.scrollTo(0, scrollY)
    }
  }, [quickView])

  useEffect(() => {
    if (!zoomedProductPhoto) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomedProductPhoto(null)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [zoomedProductPhoto])

  const priceRanges = [
    { id: "0-500", label: "Up to KSh 500", min: 0, max: 500 },
    { id: "500-1000", label: "KSh 500 – 1,000", min: 500, max: 1000 },
    { id: "1000-2000", label: "KSh 1,000 – 2,000", min: 1000, max: 2000 },
    { id: "2000+", label: "Over KSh 2,000", min: 2000, max: Infinity },
  ]
  const availableBrands = Array.from(
    new Set(storeProducts.map((product) => product.brand)),
  ).sort()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const addToCart = (
    p: Product,
    e?: React.MouseEvent,
    color = p.colors[0],
    size = p.sizes[0],
  ) => {
    e?.stopPropagation()
    setCart((prev) => {
      const ex = prev.find(
        (i) =>
          i.id === p.id && i.selectedColor === color && i.selectedSize === size,
      )
      if (ex) {
        return prev.map((i) =>
          i.id === p.id && i.selectedColor === color && i.selectedSize === size
            ? { ...i, qty: i.qty + 1 }
            : i,
        )
      }
      return [
        ...prev,
        { ...p, qty: 1, selectedColor: color, selectedSize: size },
      ]
    })
    showToast(`${p.name} added to cart`)
  }

  const toggleWish = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  const removeFromCart = (item: CartItem) =>
    setCart((prev) =>
      prev.filter(
        (i) =>
          !(
            i.id === item.id &&
            i.selectedColor === item.selectedColor &&
            i.selectedSize === item.selectedSize
          ),
      ),
    )
  const updateQty = (item: CartItem, qty: number) => {
    if (qty < 1) return removeFromCart(item)
    setCart((prev) =>
      prev.map((i) =>
        i.id === item.id &&
        i.selectedColor === item.selectedColor &&
        i.selectedSize === item.selectedSize
          ? { ...i, qty }
          : i,
      ),
    )
  }

  const openQuickView = (product: Product) => {
    setQuickView(product)
    setQuickViewColor(product.colors[0])
    setQuickViewSize(product.sizes[0])
  }

  const applyPromotion = async () => {
    if (!promotionInput.trim()) {
      setPromotionError("Enter a promotion code.")
      return
    }
    setIsValidatingPromotion(true)
    setPromotionError("")
    try {
      const promotion = await validatePromotionRemote(promotionInput, cartTotal)
      setAppliedPromotion({
        code: promotion.code,
        discount: promotion.discount,
        discountType: promotion.discountType,
      })
      setPromotionInput(promotion.code)
    } catch (error) {
      setAppliedPromotion(null)
      setPromotionError(
        error instanceof Error ? error.message : "Unable to validate code.",
      )
    } finally {
      setIsValidatingPromotion(false)
    }
  }

  const placeOrder = async () => {
    if (isPlacingOrder) return
    const requiredFields = ["Full Name", "Email", "Phone", "Address", "City"]
    if (requiredFields.some((field) => !checkoutDetails[field]?.trim())) {
      setCheckoutError("Please complete all required delivery details.")
      return
    }

    setIsPlacingOrder(true)
    try {
      const result = await placeOrderRemote({
        customer: {
          fullName: checkoutDetails["Full Name"],
          email: checkoutDetails.Email,
          phone: checkoutDetails.Phone,
          address: checkoutDetails.Address,
          city: checkoutDetails.City,
          postcode: checkoutDetails.Postcode || "",
        },
        accessToken: getCustomerOrderToken(),
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.qty,
        })),
        promotionCode: appliedPromotion?.code,
        deliveryZone: checkoutDetails.City,
      })
      const createdAt = new Date().toISOString()
      try {
        const savedCustomer = loadCustomerProfile()
        saveCustomerProfile({
          name: checkoutDetails["Full Name"].trim(),
          email: checkoutDetails.Email.trim().toLowerCase(),
          phone: checkoutDetails.Phone.trim(),
          address: checkoutDetails.Address.trim(),
          city: checkoutDetails.City.trim(),
          postcode: checkoutDetails.Postcode?.trim() || "",
          createdAt: savedCustomer?.createdAt || createdAt,
        })
        const storedOrders = JSON.parse(
          localStorage.getItem("shoparc-orders") || "[]",
        )
        localStorage.setItem(
          "shoparc-orders",
          JSON.stringify([
            {
              id: result.orderNumber,
              customer: checkoutDetails["Full Name"],
              email: checkoutDetails.Email,
              phone: checkoutDetails.Phone,
              date: new Date(createdAt).toLocaleDateString("en-KE"),
              createdAt,
              total: result.total,
              items: cartCount,
              status: "Pending",
              payment: "Not Paid",
              products: cart.map((item) => item.name),
              image: cart[0]?.image || "",
              lineItems: cart.map((item) => ({
                productId: item.id,
                name: item.name,
                category: item.type,
                quantity: item.qty,
                unitPrice: item.price,
              })),
            },
            ...(Array.isArray(storedOrders) ? storedOrders : []),
          ]),
        )
      } catch (cacheError) {
        console.error(
          "Unable to cache the new order on this device.",
          cacheError,
        )
      }
      const refreshedProducts = await fetchProducts()
      setStoreProducts(
        refreshedProducts.map(
          ({ sku: _sku, status: _status, sales: _sales, ...product }) =>
            product,
        ),
      )
      setCart([])
      setCheckoutDetails({})
      setAppliedPromotion(null)
      setPromotionInput("")
      setCheckoutError("")
      setPromotionError("")
      setOrderPlaced(true)
    } catch (error) {
      console.error("Unable to place order in Supabase.", error)
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Your order could not be saved. Please try again.",
      )
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const discountTotal = appliedPromotion?.discount ?? 0
  const checkoutTotal = Math.max(0, cartTotal - discountTotal)

  const filtered = storeProducts
    .filter((p) => {
      const s = search.toLowerCase()
      const matchSearch =
        !s ||
        p.name.toLowerCase().includes(s) ||
        p.brand.toLowerCase().includes(s)
      const matchBrand =
        selectedBrands.length === 0 || selectedBrands.includes(p.brand)
      const matchPrice =
        selectedPriceRanges.length === 0 ||
        selectedPriceRanges.some((rangeId) => {
          const range = priceRanges.find((item) => item.id === rangeId)
          return range ? p.price >= range.min && p.price <= range.max : true
        })
      if (!matchSearch || !matchBrand || !matchPrice) return false
      switch (activeCat) {
        case "all":
          return true
        case "new":
          return p.isNew
        case "sale":
          return p.isSale
        case "clothing":
          return p.type === "Clothing"
        case "shoes":
          return p.type === "Shoes"
        case "bags":
          return p.type === "Bags"
        case "accessories":
          return p.type === "Accessories"
        case "men":
          return p.gender === "Men" || p.gender === "Unisex"
        case "women":
          return p.gender === "Women" || p.gender === "Unisex"
        case "kids":
          return p.gender === "Kids"
        default:
          return true
      }
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price
      if (sortBy === "price-desc") return b.price - a.price
      if (sortBy === "rating") return b.rating - a.rating
      return 0
    })

  const activeCatLabel =
    navCategories.find((c) => c.id === activeCat)?.label || "All Products"

  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "#0f172a",
            color: "#fff",
            padding: "11px 22px",
            borderRadius: 30,
            fontSize: 13.5,
            fontWeight: 600,
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
            animation: "fadeIn 0.25s ease",
          }}
        >
          ✓ {toast}
        </div>
      )}

      {/* ── Header ── */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Announcement */}
        <div
          style={{
            background: DARK,
            color: "#94a3b8",
            fontSize: 12.5,
            padding: "7px 0",
            textAlign: "center",
            letterSpacing: "0.02em",
          }}
        >
          Free delivery around CBD · Paid delivery outside CBD
          {availablePromotions[0] && (
            <>
              {" · "}Use{" "}
              <span style={{ color: "#93c5fd", fontWeight: 700 }}>
                {availablePromotions[0].code}
              </span>{" "}
              for {describePromotion(availablePromotions[0])} at checkout
              {availablePromotions.length > 1
                ? ` · ${availablePromotions.length - 1} more offer${
                    availablePromotions.length > 2 ? "s" : ""
                  }`
                : ""}
            </>
          )}
        </div>

        <div
          className="store-header-inner"
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            minHeight: 64,
          }}
        >
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              width: 36,
              height: 36,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              flexShrink: 0,
            }}
          >
            <Menu size={20} color="#475569" />
          </button>

          {/* Logo */}
          <a href="#" style={{ textDecoration: "none", flexShrink: 0 }}>
            <span
              style={{
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontWeight: 800,
                fontSize: 21,
                color: DARK,
                letterSpacing: "-0.5px",
              }}
            >
              nelz<span style={{ color: ACCENT }}>collections</span>
            </span>
          </a>

          {/* Top-level gender nav */}
          <nav
            className="store-desktop-nav"
            style={{ display: "flex", gap: 2, marginLeft: 12 }}
          >
            {["Women", "Men", "Kids", "New Arrivals", "Sale"].map((label) => {
              const catId =
                label === "New Arrivals"
                  ? "new"
                  : label === "Sale"
                    ? "sale"
                    : label.toLowerCase()
              const active = activeCat === catId
              return (
                <button
                  key={label}
                  onClick={() => setActiveCat(catId)}
                  style={{
                    padding: "6px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13.5,
                    fontWeight: active ? 700 : 500,
                    color:
                      label === "Sale"
                        ? "#dc2626"
                        : active
                          ? ACCENT
                          : "#475569",
                    borderRadius: 6,
                    transition: "color 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              )
            })}
          </nav>

          {/* Search */}
          <div
            className="store-search"
            style={{ flex: 1, maxWidth: 420, position: "relative" }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clothes, shoes, bags…"
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 24,
                fontSize: 13.5,
                outline: "none",
                background: "#f8fafc",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = ACCENT)}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          {/* Actions */}
          <div
            className="store-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginLeft: "auto",
            }}
          >
            <button
              onClick={() => onViewChange("customer")}
              className="store-account-button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                background: "none",
                border: "1.5px solid #e2e8f0",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                color: DARK,
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "#e2e8f0")
              }
            >
              <User size={15} /> Account
            </button>

            <button
              className="store-cart-button"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                background: ACCENT,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 700,
                color: "#fff",
                transition: "background 0.2s",
              }}
              onClick={() => {
                setCartOpen(true)
                setCheckoutStep("cart")
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#1d4ed8")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
            >
              <ShoppingCart size={15} /> Cart
              {cartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -7,
                    right: -7,
                    background: "#dc2626",
                    color: "#fff",
                    borderRadius: "50%",
                    minWidth: 18,
                    height: 18,
                    padding: "0 3px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10.5,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onViewChange("admin")}
              className="store-admin-button"
              style={{
                padding: "7px 12px",
                background: "#f1f5f9",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 700,
                color: "#64748b",
                letterSpacing: "0.03em",
              }}
            >
              Admin
            </button>
          </div>
        </div>
      </header>

      {/* ── Body: Sidebar + Main ── */}
      <div
        className="store-body"
        style={{
          display: "flex",
          maxWidth: 1400,
          margin: "0 auto",
          minHeight: "calc(100vh - 130px)",
        }}
      >
        {sidebarOpen && (
          <button
            className="store-sidebar-backdrop"
            aria-label="Close categories"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`store-sidebar ${sidebarOpen ? "is-open" : ""}`}
          style={{
            width: sidebarOpen ? 220 : 0,
            flexShrink: 0,
            overflow: "hidden",
            transition: "width 0.25s ease",
            background: "#fff",
            borderRight: "1px solid #e2e8f0",
            position: "sticky",
            top: 130,
            height: "calc(100vh - 130px)",
            overflowY: "auto",
          }}
        >
          <div style={{ padding: "24px 0", width: 220 }}>
            <div style={{ padding: "0 16px", marginBottom: 4 }}>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#94a3b8",
                  margin: "0 0 8px",
                }}
              >
                Browse
              </p>
            </div>

            {navCategories.map((cat) => {
              if (cat.id.startsWith("divider"))
                return (
                  <div
                    key={cat.id}
                    style={{
                      height: 1,
                      background: "#f1f5f9",
                      margin: "8px 16px",
                    }}
                  />
                )
              const active = activeCat === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 16px",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    background: active ? "#eff6ff" : "transparent",
                    color: active ? ACCENT : "#374151",
                    fontWeight: active ? 700 : 500,
                    fontSize: 13.5,
                    borderLeft: active
                      ? `3px solid ${ACCENT}`
                      : "3px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "#f8fafc"
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.background = "transparent"
                  }}
                >
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  {cat.label}
                  {cat.id === "sale" && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#dc2626",
                        background: "#fee2e2",
                        padding: "2px 6px",
                        borderRadius: 8,
                      }}
                    >
                      HOT
                    </span>
                  )}
                  {cat.id === "new" && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#2563eb",
                        background: "#dbeafe",
                        padding: "2px 6px",
                        borderRadius: 8,
                      }}
                    >
                      NEW
                    </span>
                  )}
                </button>
              )
            })}

            <div
              style={{ height: 1, background: "#f1f5f9", margin: "12px 16px" }}
            />

            {/* Price filter */}
            <div style={{ padding: "0 16px" }}>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#94a3b8",
                  margin: "0 0 10px",
                }}
              >
                Price Range
              </p>
              {priceRanges.map((range) => (
                <label
                  key={range.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 0",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#374151",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedPriceRanges.includes(range.id)}
                    onChange={() =>
                      setSelectedPriceRanges((current) =>
                        current.includes(range.id)
                          ? current.filter((id) => id !== range.id)
                          : [...current, range.id],
                      )
                    }
                    style={{ accentColor: ACCENT, width: 14, height: 14 }}
                  />
                  {range.label}
                </label>
              ))}
            </div>

            <div
              style={{ height: 1, background: "#f1f5f9", margin: "12px 16px" }}
            />

            {/* Brand filter */}
            <div style={{ padding: "0 16px" }}>
              <p
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#94a3b8",
                  margin: "0 0 10px",
                }}
              >
                Brand
              </p>
              {availableBrands.map((brand) => (
                <label
                  key={brand}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 0",
                    cursor: "pointer",
                    fontSize: 13,
                    color: "#374151",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() =>
                      setSelectedBrands((current) =>
                        current.includes(brand)
                          ? current.filter((item) => item !== brand)
                          : [...current, brand],
                      )
                    }
                    style={{ accentColor: ACCENT, width: 14, height: 14 }}
                  />
                  {brand}
                </label>
              ))}
              {(selectedBrands.length > 0 ||
                selectedPriceRanges.length > 0) && (
                <button
                  onClick={() => {
                    setSelectedBrands([])
                    setSelectedPriceRanges([])
                  }}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: "7px 10px",
                    border: "1px solid #bfdbfe",
                    borderRadius: 7,
                    background: "#eff6ff",
                    color: ACCENT,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className="store-main"
          style={{ flex: 1, minWidth: 0, padding: "28px 28px" }}
        >
          {/* Hero Banner */}
          {activeCat === "all" && !search && (
            <div
              className="store-hero"
              style={{
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: 32,
                position: "relative",
                height: 340,
                background: "#0f172a",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop&auto=format&crop=top"
                alt="Summer Collection"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.45,
                }}
              />
              <div
                className="store-hero-content"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "0 52px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    background: "#2563eb",
                    color: "#fff",
                    fontSize: 11.5,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "5px 14px",
                    borderRadius: 20,
                    marginBottom: 18,
                    width: "fit-content",
                  }}
                >
                  Summer 2026 Collection
                </span>
                <h1
                  className="store-hero-title"
                  style={{
                    fontFamily: "Plus Jakarta Sans, sans-serif",
                    fontSize: 46,
                    fontWeight: 800,
                    color: "#fff",
                    margin: "0 0 14px",
                    lineHeight: 1.1,
                    letterSpacing: "-1px",
                    maxWidth: 520,
                  }}
                >
                  Dress for the
                  <br />
                  life you want.
                </h1>
                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: 16,
                    margin: "0 0 28px",
                    maxWidth: 380,
                  }}
                >
                  New arrivals in clothing, shoes &amp; bags — up to 40% off
                  selected styles.
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => setActiveCat("new")}
                    style={{
                      padding: "12px 26px",
                      background: "#fff",
                      color: DARK,
                      border: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    Shop New Arrivals <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => setActiveCat("sale")}
                    style={{
                      padding: "12px 26px",
                      background: "transparent",
                      color: "#fff",
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    View Sale
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Category Pills */}
          <div
            className="store-category-pills"
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {[
              { id: "all", label: "All" },
              { id: "new", label: "✨ New In" },
              { id: "sale", label: "🔥 Sale" },
              { id: "clothing", label: "👔 Clothing" },
              { id: "shoes", label: "👟 Shoes" },
              { id: "bags", label: "👜 Bags" },
              { id: "accessories", label: "💍 Accessories" },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  border:
                    activeCat === c.id
                      ? `2px solid ${ACCENT}`
                      : "2px solid #e2e8f0",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: activeCat === c.id ? 700 : 500,
                  background: activeCat === c.id ? ACCENT : "#fff",
                  color: activeCat === c.id ? "#fff" : "#475569",
                  transition: "all 0.15s",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div
            className="store-toolbar"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontSize: 20,
                  fontWeight: 800,
                  color: DARK,
                  margin: "0 0 2px",
                  letterSpacing: "-0.3px",
                }}
              >
                {activeCatLabel}
              </h2>
              <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0 }}>
                {isLoadingProducts
                  ? "Loading styles..."
                  : `${filtered.length} styles`}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "7px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "#374151",
                  background: "#fff",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Best Rated</option>
              </select>
              <div
                style={{
                  display: "flex",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {([2, 3, 4] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setGridView(n)}
                    style={{
                      padding: "7px 10px",
                      border: "none",
                      cursor: "pointer",
                      background: gridView === n ? ACCENT : "#fff",
                      color: gridView === n ? "#fff" : "#94a3b8",
                      fontSize: 12,
                      transition: "all 0.15s",
                    }}
                  >
                    {n === 2 ? <LayoutList size={14} /> : <Grid2X2 size={14} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {isLoadingProducts ? (
            <div
              className="store-product-grid"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridView}, 1fr)`,
                gap: 18,
              }}
              role="status"
              aria-label="Loading products"
              aria-busy="true"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="product-card-skeleton product-card-loading"
                  aria-hidden="true"
                >
                  <span className="product-skeleton-image" />
                  <span className="product-skeleton-details">
                    <span className="product-skeleton-line product-skeleton-brand" />
                    <span className="product-skeleton-line product-skeleton-title" />
                    <span className="product-skeleton-line product-skeleton-price" />
                    <span className="product-skeleton-button" />
                  </span>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "#94a3b8",
              }}
            >
              <Package
                size={48}
                style={{
                  margin: "0 auto 16px",
                  display: "block",
                  opacity: 0.3,
                }}
              />
              <p style={{ fontSize: 16, fontWeight: 600 }}>
                {storeLoadError
                  ? "Products are temporarily unavailable"
                  : "No styles found"}
              </p>
              <p style={{ fontSize: 13.5 }}>
                {storeLoadError || "Try a different search or category"}
              </p>
            </div>
          ) : (
            <div
              className="store-product-grid"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${gridView}, 1fr)`,
                gap: 18,
              }}
            >
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  inWishlist={wishlist.includes(product.id)}
                  onWishlist={(e) => toggleWish(product.id, e)}
                  onQuickView={() => openQuickView(product)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Trust Strip + Footer */}
      <footer style={{ background: DARK, color: "#64748b", marginTop: 64 }}>
        <div style={{ borderBottom: "1px solid #1e293b", padding: "20px 0" }}>
          <div
            style={{
              maxWidth: 1400,
              margin: "0 auto",
              padding: "0 28px",
              display: "flex",
              justifyContent: "center",
              gap: 56,
              flexWrap: "wrap",
            }}
          >
            {[
              [Truck, "Free delivery around CBD"],
              [RefreshCw, "30-day returns"],
              [Shield, "Secure checkout"],
              [Package, "Live order tracking"],
            ].map(([Icon, label]) => (
              <div
                key={label as string}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <Icon size={16} style={{ color: "#60a5fa" }} />
                {label as string}
              </div>
            ))}
          </div>
        </div>
        <div
          className="store-footer-grid"
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "40px 28px 24px",
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 40,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontWeight: 800,
                fontSize: 20,
                color: "#fff",
                marginBottom: 10,
              }}
            >
              nelz<span style={{ color: "#60a5fa" }}>collections</span>
            </div>
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.8,
                maxWidth: 260,
                margin: "0 0 20px",
              }}
            >
              Premium fashion for every lifestyle. Curated clothes, shoes and
              bags from the world's best brands.
            </p>
          </div>
          {[
            [
              "Shop",
              ["Women", "Men", "Kids", "New Arrivals", "Sale", "Bags", "Shoes"],
            ],
            [
              "Help",
              ["Size Guide", "Track Order", "Returns", "Contact Us", "FAQs"],
            ],
            [
              "Company",
              ["About Us", "Careers", "Press", "Sustainability", "Privacy"],
            ],
          ].map(([title, links]) => (
            <div key={title as string}>
              <h4
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#e2e8f0",
                  margin: "0 0 14px",
                }}
              >
                {title as string}
              </h4>
              {(links as string[]).map((link) => (
                <a
                  key={link}
                  href="#"
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "#64748b",
                    textDecoration: "none",
                    marginBottom: 7,
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.color = "#93c5fd")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.color = "#64748b")
                  }
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: "1px solid #1e293b",
            padding: "16px 28px",
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 12 }}>
            © 2026 Nelzcollections. All rights reserved.
          </span>
        </div>
        <div
          style={{
            borderTop: "1px solid #1e293b",
            padding: "12px 28px",
            textAlign: "center",
            fontSize: 12,
          }}
        >
          Designed &amp; Developed by Lamech001, Tel:+254798868512.
        </div>
      </footer>

      {/* ── Cart / Checkout Drawer ── */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
            }}
            onClick={() => {
              setCartOpen(false)
              setOrderPlaced(false)
            }}
          />
          <div
            className="cart-drawer"
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 440,
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
              animation: "slideIn 0.25s ease",
            }}
          >
            {orderPlaced ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 40,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    background: "#dcfce7",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <span style={{ fontSize: 32 }}>✓</span>
                </div>
                <h2
                  style={{
                    fontFamily: "Plus Jakarta Sans, sans-serif",
                    fontSize: 22,
                    fontWeight: 800,
                    color: DARK,
                    margin: "0 0 10px",
                  }}
                >
                  Order Placed!
                </h2>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                    lineHeight: 1.7,
                    margin: "0 0 28px",
                  }}
                >
                  Thank you for your order. We'll send you a confirmation email
                  with tracking info shortly.
                </p>
                <button
                  onClick={() => {
                    setOrderPlaced(false)
                    setCartOpen(false)
                  }}
                  style={{
                    padding: "11px 28px",
                    background: ACCENT,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Continue Shopping
                </button>
              </div>
            ) : checkoutStep === "cart" ? (
              <>
                <div
                  style={{
                    padding: "18px 24px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontSize: 17,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    Your Cart ({cartCount})
                  </h2>
                  <button
                    onClick={() => setCartOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94a3b8",
                      padding: 4,
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div
                  style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}
                >
                  {cart.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "60px 0",
                        color: "#94a3b8",
                      }}
                    >
                      <ShoppingCart
                        size={44}
                        style={{
                          margin: "0 auto 14px",
                          display: "block",
                          opacity: 0.2,
                        }}
                      />
                      <p style={{ fontSize: 15, fontWeight: 600 }}>
                        Your cart is empty
                      </p>
                      <p style={{ fontSize: 13 }}>Add something you love</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={`${item.id}-${item.selectedColor}-${item.selectedSize}`}
                        style={{
                          display: "flex",
                          gap: 14,
                          padding: "14px 0",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{
                            width: 80,
                            height: 100,
                            objectFit: "cover",
                            borderRadius: 10,
                            background: "#f1f5f9",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <p
                            style={{
                              margin: "0 0 2px",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {item.brand}
                          </p>
                          <p
                            style={{
                              margin: "0 0 4px",
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: DARK,
                              lineHeight: 1.3,
                            }}
                          >
                            {item.name}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 5,
                              fontSize: 11.5,
                              color: "#64748b",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span
                                style={{
                                  width: 11,
                                  height: 11,
                                  borderRadius: "50%",
                                  background: item.selectedColor,
                                  border: "1px solid #cbd5e1",
                                }}
                              />
                              Colour
                            </span>
                            <span>Size: {item.selectedSize}</span>
                          </div>
                          <p
                            style={{
                              margin: "0 0 10px",
                              fontSize: 15,
                              fontWeight: 800,
                              color: ACCENT,
                            }}
                          >
                            KSh {item.price.toFixed(2)}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <button
                              onClick={() => updateQty(item, item.qty - 1)}
                              style={{
                                width: 28,
                                height: 28,
                                border: "1px solid #e2e8f0",
                                borderRadius: 6,
                                background: "#f8fafc",
                                cursor: "pointer",
                                fontSize: 16,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                lineHeight: 1,
                              }}
                            >
                              −
                            </button>
                            <span
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                minWidth: 22,
                                textAlign: "center",
                              }}
                            >
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQty(item, item.qty + 1)}
                              style={{
                                width: 28,
                                height: 28,
                                border: "1px solid #e2e8f0",
                                borderRadius: 6,
                                background: "#f8fafc",
                                cursor: "pointer",
                                fontSize: 16,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                lineHeight: 1,
                              }}
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeFromCart(item)}
                              style={{
                                marginLeft: "auto",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#dc2626",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {cart.length > 0 && (
                  <div
                    style={{
                      padding: "16px 24px",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "#64748b", fontSize: 13.5 }}>
                        Subtotal
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                        KSh {cartTotal.toFixed(2)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "#64748b", fontSize: 13.5 }}>
                        Delivery
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 12.5,
                          color: "#16a34a",
                        }}
                      >
                        Free around CBD
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        margin: "4px 0 8px",
                      }}
                    >
                      Delivery outside CBD is paid separately and is not
                      included in your order total.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 18,
                        paddingTop: 12,
                        borderTop: "1px solid #e2e8f0",
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: 16 }}>
                        Total
                      </span>
                      <span
                        style={{ fontWeight: 800, fontSize: 18, color: DARK }}
                      >
                        KSh {cartTotal.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => setCheckoutStep("checkout")}
                      style={{
                        width: "100%",
                        padding: "13px",
                        background: ACCENT,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 800,
                        cursor: "pointer",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      Checkout
                    </button>
                    <p
                      style={{
                        textAlign: "center",
                        fontSize: 12,
                        color: "#94a3b8",
                        margin: "10px 0 0",
                      }}
                    >
                      🔒 Secure · 256-bit SSL encrypted
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div
                  style={{
                    padding: "18px 24px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={() => setCheckoutStep("cart")}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: ACCENT,
                      fontSize: 13,
                      fontWeight: 600,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    ← Back
                  </button>
                  <h2
                    style={{
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontSize: 17,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    Checkout
                  </h2>
                  <div style={{ width: 40 }} />
                </div>
                <div
                  style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}
                >
                  <p
                    style={{
                      fontSize: 11.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#94a3b8",
                      margin: "0 0 14px",
                    }}
                  >
                    Delivery Address
                  </p>
                  <div
                    className="checkout-fields"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      "Full Name",
                      "Email",
                      "Phone",
                      "Address",
                      "City",
                      "Postcode",
                    ].map((label) => (
                      <div key={label}>
                        <label
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: "#64748b",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          {label}
                        </label>
                        <input
                          placeholder={label}
                          value={checkoutDetails[label] || ""}
                          onChange={(e) => {
                            setCheckoutDetails((details) => ({
                              ...details,
                              [label]: e.target.value,
                            }))
                            setCheckoutError("")
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1.5px solid #e2e8f0",
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
                  </div>

                  {/* Pay on Delivery */}
                  <p
                    style={{
                      fontSize: 11.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#94a3b8",
                      margin: "0 0 12px",
                    }}
                  >
                    Payment Method
                  </p>
                  <div
                    style={{
                      border: "2px solid #2563eb",
                      borderRadius: 10,
                      padding: "14px 16px",
                      background: "#eff6ff",
                      marginBottom: 20,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "2px solid #2563eb",
                        background: "#2563eb",
                        flexShrink: 0,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          background: "#fff",
                          borderRadius: "50%",
                        }}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#1d4ed8",
                          marginBottom: 4,
                        }}
                      >
                        💵 Pay on Delivery (Cash)
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "#3b82f6",
                          lineHeight: 1.6,
                        }}
                      >
                        Pay in cash when your order arrives at your door. Our
                        rider will collect the exact amount.
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 16,
                      padding: "12px 14px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      background: "#fff",
                    }}
                  >
                    <label
                      htmlFor="checkout-promotion-code"
                      style={{
                        display: "block",
                        marginBottom: 8,
                        color: "#475569",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Promotion code (optional)
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        id="checkout-promotion-code"
                        value={promotionInput}
                        onChange={(event) => {
                          setPromotionInput(event.target.value.toUpperCase())
                          setAppliedPromotion(null)
                          setPromotionError("")
                        }}
                        placeholder="Enter code"
                        style={{
                          minWidth: 0,
                          flex: 1,
                          padding: "9px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: 7,
                          fontSize: 13,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void applyPromotion()}
                        disabled={isValidatingPromotion}
                        style={{
                          padding: "8px 14px",
                          border: "none",
                          borderRadius: 7,
                          background: ACCENT,
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: isValidatingPromotion ? "wait" : "pointer",
                        }}
                      >
                        {isValidatingPromotion ? "Checking..." : "Apply"}
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 7,
                        marginTop: 10,
                      }}
                    >
                      {availablePromotions.map((promotion) => (
                        <button
                          key={promotion.code}
                          type="button"
                          onClick={() => {
                            setPromotionInput(promotion.code)
                            setAppliedPromotion(null)
                            setPromotionError("")
                          }}
                          style={{
                            padding: "5px 9px",
                            border: "1px solid #bfdbfe",
                            borderRadius: 6,
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          aria-label={`Use promotion ${promotion.code}, ${describePromotion(promotion)}${
                            promotion.minimumSubtotal > 0
                              ? `, minimum order KSh ${promotion.minimumSubtotal.toFixed(2)}`
                              : ""
                          }`}
                        >
                          {promotion.code} · {describePromotion(promotion)}
                          {promotion.minimumSubtotal > 0 &&
                            ` · Min. KSh ${promotion.minimumSubtotal.toFixed(2)}`}
                        </button>
                      ))}
                      {arePromotionsLoading &&
                        availablePromotions.length === 0 && (
                          <span
                            role="status"
                            style={{ color: "#64748b", fontSize: 11.5 }}
                          >
                            Loading available offers...
                          </span>
                        )}
                      {!arePromotionsLoading &&
                        availablePromotions.length === 0 && (
                          <span
                            role={promotionLoadError ? "alert" : "note"}
                            style={{
                              color: promotionLoadError ? "#b91c1c" : "#64748b",
                              fontSize: 11.5,
                            }}
                          >
                            {promotionLoadError
                              ? "Offers could not be loaded. You can still enter a code."
                              : "No active offers right now."}
                          </span>
                        )}
                    </div>
                    {appliedPromotion && (
                      <p
                        role="status"
                        style={{
                          margin: "8px 0 0",
                          color: "#15803d",
                          fontSize: 12,
                        }}
                      >
                        {appliedPromotion.code} applied
                        {appliedPromotion.discountType === "free_shipping"
                          ? " — free delivery applied"
                          : ` — KSh ${appliedPromotion.discount.toFixed(2)} off`}
                      </p>
                    )}
                    {promotionError && (
                      <p
                        role="alert"
                        style={{
                          margin: "8px 0 0",
                          color: "#b91c1c",
                          fontSize: 12,
                        }}
                      >
                        {promotionError}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      background: "#f8fafc",
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        Subtotal
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        KSh {cartTotal.toFixed(2)}
                      </span>
                    </div>
                    {discountTotal > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          color: "#15803d",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>Promotion discount</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                          − KSh {discountTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        Delivery
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#16a34a",
                        }}
                      >
                        Free around CBD
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        margin: "-4px 0 10px",
                      }}
                    >
                      Delivery outside CBD is paid separately and is not
                      included in your order total.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 10,
                        borderTop: "1px solid #e2e8f0",
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 800 }}>
                        Amount Due on Delivery
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>
                        KSh {checkoutTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px 24px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  {checkoutError && (
                    <p
                      role="alert"
                      style={{
                        color: "#dc2626",
                        fontSize: 12.5,
                        fontWeight: 700,
                        margin: "0 0 10px",
                      }}
                    >
                      {checkoutError}
                    </p>
                  )}
                  <button
                    onClick={() => void placeOrder()}
                    disabled={isPlacingOrder}
                    style={{
                      width: "100%",
                      padding: "13px",
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: isPlacingOrder ? "wait" : "pointer",
                      opacity: isPlacingOrder ? 0.7 : 1,
                    }}
                  >
                    {isPlacingOrder
                      ? "Placing order..."
                      : `Place Order · KSh ${checkoutTotal.toFixed(2)}`}
                  </button>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: "#94a3b8",
                      margin: "8px 0 0",
                    }}
                  >
                    💵 Pay in cash on delivery — no card needed
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Quick View Modal ── */}
      {quickView && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            className="quick-view-backdrop"
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              touchAction: "none",
            }}
            onClick={() => setQuickView(null)}
          />
          <div
            className="quick-view"
            style={{
              position: "relative",
              background: "#fff",
              borderRadius: 16,
              overflowX: "hidden",
              overflowY: "auto",
              width: "100%",
              maxWidth: 780,
              maxHeight: "calc(100dvh - 32px)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
              animation: "fadeIn 0.2s ease",
              touchAction: "pan-y",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              className="quick-view-image"
              style={{
                background: "#f8fafc",
                position: "relative",
                minWidth: 0,
              }}
            >
              <button
                type="button"
                aria-label={`View ${quickView.name} photo full screen`}
                onClick={() => setZoomedProductPhoto(quickView.image)}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  minHeight: 420,
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  cursor: "zoom-in",
                  touchAction: "manipulation",
                }}
              >
                <img
                  src={quickView.image}
                  alt={quickView.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 420,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </button>
              {quickView.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    background: quickView.badgeColor!,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 6,
                    pointerEvents: "none",
                  }}
                >
                  {quickView.badge}
                </span>
              )}
            </div>
            <div
              style={{
                padding: "32px 28px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <button
                onClick={() => setQuickView(null)}
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={15} />
              </button>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  margin: "0 0 6px",
                }}
              >
                {quickView.brand}
              </p>
              <h2
                style={{
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontSize: 22,
                  fontWeight: 800,
                  color: DARK,
                  margin: "0 0 10px",
                  lineHeight: 1.2,
                }}
              >
                {quickView.name}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 16,
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    fill={i < Math.floor(quickView.rating) ? "#f59e0b" : "none"}
                    color="#f59e0b"
                  />
                ))}
                <span style={{ fontSize: 12.5, color: "#64748b" }}>
                  ({quickView.reviews.toLocaleString()})
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <span
                  style={{
                    fontFamily: "Plus Jakarta Sans, sans-serif",
                    fontSize: 26,
                    fontWeight: 800,
                    color: DARK,
                  }}
                >
                  KSh {quickView.price.toFixed(2)}
                </span>
                {quickView.originalPrice && (
                  <span
                    style={{
                      fontSize: 16,
                      color: "#94a3b8",
                      textDecoration: "line-through",
                    }}
                  >
                    KSh {quickView.originalPrice.toFixed(2)}
                  </span>
                )}
                {quickView.originalPrice && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#dc2626",
                      background: "#fee2e2",
                      padding: "2px 8px",
                      borderRadius: 10,
                    }}
                  >
                    {Math.round(
                      (1 - quickView.price / quickView.originalPrice) * 100,
                    )}
                    % off
                  </span>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Colour
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {quickView.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Choose colour ${c}`}
                      aria-pressed={quickViewColor === c}
                      onClick={() => setQuickViewColor(c)}
                      style={{
                        width: 44,
                        height: 44,
                        minHeight: 0,
                        padding: 7,
                        borderRadius: "50%",
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        cursor: "pointer",
                        boxShadow:
                          quickViewColor === c ? `0 0 0 2px ${ACCENT}` : "none",
                        touchAction: "manipulation",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: "block",
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          background: c,
                          border: "1px solid #cbd5e1",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Size
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {quickView.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={quickViewSize === s}
                      onClick={() => setQuickViewSize(s)}
                      style={{
                        minWidth: 48,
                        minHeight: 44,
                        padding: "9px 14px",
                        border:
                          quickViewSize === s
                            ? `2px solid ${ACCENT}`
                            : "2px solid #e2e8f0",
                        borderRadius: 6,
                        background: quickViewSize === s ? "#eff6ff" : "#fff",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        color: quickViewSize === s ? ACCENT : "#374151",
                        touchAction: "manipulation",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                <button
                  onClick={() => {
                    addToCart(
                      quickView,
                      undefined,
                      quickViewColor,
                      quickViewSize,
                    )
                    setQuickView(null)
                  }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: ACCENT,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Add to Cart
                </button>
                <button
                  onClick={(e) => {
                    toggleWish(quickView.id, e)
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    background: wishlist.includes(quickView.id)
                      ? "#fee2e2"
                      : "#f1f5f9",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Heart
                    size={18}
                    fill={wishlist.includes(quickView.id) ? "#dc2626" : "none"}
                    color={
                      wishlist.includes(quickView.id) ? "#dc2626" : "#64748b"
                    }
                  />
                </button>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: quickView.stock < 15 ? "#d97706" : "#16a34a",
                  marginTop: 10,
                  fontWeight: 600,
                }}
              >
                {quickView.stock === 0
                  ? "✗ Out of stock"
                  : quickView.stock < 15
                    ? `⚡ Only ${quickView.stock} left in stock`
                    : "✓ In stock — ships in 1–2 days"}
              </p>
            </div>
          </div>
        </div>
      )}
      {zoomedProductPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen product photo"
          onClick={() => setZoomedProductPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(2, 6, 23, 0.96)",
            touchAction: "manipulation",
          }}
        >
          <button
            type="button"
            aria-label="Close full-screen product photo"
            onClick={() => setZoomedProductPhoto(null)}
            style={{
              position: "absolute",
              top: "max(16px, env(safe-area-inset-top))",
              right: "max(16px, env(safe-area-inset-right))",
              zIndex: 1,
              width: 48,
              height: 48,
              display: "grid",
              placeItems: "center",
              border: 0,
              borderRadius: "50%",
              background: "#fff",
              color: DARK,
              cursor: "pointer",
            }}
          >
            <X size={22} />
          </button>
          <img
            src={zoomedProductPhoto}
            alt="Product full-screen view"
            onClick={(event) => event.stopPropagation()}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              touchAction: "pinch-zoom",
            }}
          />
        </div>
      )}
    </div>
  )
}

/* ── Product Card ── */
interface CardProps {
  product: Product
  inWishlist: boolean
  onWishlist: (e: React.MouseEvent) => void
  onQuickView: () => void
}

function ProductCard({
  product,
  inWishlist,
  onWishlist,
  onQuickView,
}: CardProps) {
  const [hovered, setHovered] = useState(false)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    if (typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsNearViewport(true)
        observer.disconnect()
      },
      { rootMargin: "400px 0px" },
    )

    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      onClick={imageLoaded || imageFailed ? onQuickView : undefined}
      onKeyDown={(event) => {
        if (
          (imageLoaded || imageFailed) &&
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault()
          onQuickView()
        }
      }}
      role="group"
      tabIndex={imageLoaded || imageFailed ? 0 : -1}
      aria-label={`View ${product.name} and choose options`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        cursor: "pointer",
        borderRadius: 12,
        background: "#fff",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        transition: "box-shadow 0.2s, transform 0.2s",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.10)" : "none",
        transform: hovered ? "translateY(-3px)" : "none",
      }}
    >
      {isNearViewport ? (
        <>
          {/* Image */}
          <div
            style={{
              position: "relative",
              paddingTop: "125%",
              background: "#f8fafc",
              overflow: "hidden",
            }}
          >
            <img
              src={product.image}
              alt={product.name}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.4s ease",
                transform: hovered ? "scale(1.06)" : "scale(1)",
              }}
            />
            {product.badge && (
              <span
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  background: product.badgeColor!,
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: "3px 9px",
                  borderRadius: 5,
                  letterSpacing: "0.02em",
                }}
              >
                {product.badge}
              </span>
            )}
            <button
              onClick={onWishlist}
              disabled={!imageLoaded && !imageFailed}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                background: "rgba(255,255,255,0.95)",
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
              }}
            >
              <Heart
                size={14}
                fill={inWishlist ? "#dc2626" : "none"}
                color={inWishlist ? "#dc2626" : "#94a3b8"}
              />
            </button>
          </div>

          {/* Info */}
          <div style={{ padding: "12px 14px 14px" }}>
            <p
              style={{
                margin: "0 0 3px",
                fontSize: 10.5,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#94a3b8",
              }}
            >
              {product.brand}
            </p>
            <h3
              style={{
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: 13.5,
                fontWeight: 700,
                color: "#0f172a",
                margin: "0 0 8px",
                lineHeight: 1.3,
              }}
            >
              {product.name}
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}
                >
                  KSh {product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      textDecoration: "line-through",
                    }}
                  >
                    KSh {product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}
                >
                  {product.rating}
                </span>
              </div>
            </div>

            {product.stock < 10 && product.stock > 0 && (
              <p
                style={{
                  fontSize: 11,
                  color: "#d97706",
                  fontWeight: 700,
                  margin: "0 0 8px",
                }}
              >
                Only {product.stock} left!
              </p>
            )}

            <button
              onClick={(event) => {
                event.stopPropagation()
                onQuickView()
              }}
              style={{
                width: "100%",
                marginTop: 8,
                minHeight: 44,
                padding: "10px 0",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#1d4ed8")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "#2563eb")
              }
            >
              <ShoppingCart size={13} />
              Add to Cart
            </button>
          </div>
          {!imageLoaded && !imageFailed && (
            <div
              className="product-card-skeleton product-card-skeleton-overlay"
              role="status"
              aria-label={`Loading ${product.name}`}
            >
              <span className="product-skeleton-image" />
              <span className="product-skeleton-details">
                <span className="product-skeleton-line product-skeleton-brand" />
                <span className="product-skeleton-line product-skeleton-title" />
                <span className="product-skeleton-line product-skeleton-price" />
                <span className="product-skeleton-button" />
              </span>
            </div>
          )}
        </>
      ) : (
        <div
          className="product-card-skeleton"
          role="status"
          aria-label={`Loading ${product.name}`}
        >
          <span className="product-skeleton-image" />
          <span className="product-skeleton-details">
            <span className="product-skeleton-line product-skeleton-brand" />
            <span className="product-skeleton-line product-skeleton-title" />
            <span className="product-skeleton-line product-skeleton-price" />
            <span className="product-skeleton-button" />
          </span>
        </div>
      )}
    </div>
  )
}
