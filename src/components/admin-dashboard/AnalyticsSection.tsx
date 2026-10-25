import { useEffect, useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ANALYTICS_CACHE_KEY,
  type InventoryProduct,
} from "../../data/localStore"
import { ACCENT, DARK } from "./constants"
import type { AdminOrder } from "./types"

const CATEGORIES = [
  { name: "Clothing", color: "#2563eb" },
  { name: "Shoes", color: "#7c3aed" },
  { name: "Bags", color: "#059669" },
  { name: "Accessories", color: "#d97706" },
]

interface AnalyticsData {
  salesData: {
    month: string
    revenue: number
    orders: number
    customers: number
  }[]
  categoryRevenue: {
    name: string
    value: number
    color: string
  }[]
}

interface AnalyticsCache {
  version: 1
  signature: string
  data: AnalyticsData
}

interface AnalyticsSectionProps {
  orders: AdminOrder[]
  products: InventoryProduct[]
}

const fingerprint = (orders: AdminOrder[], products: InventoryProduct[]) =>
  JSON.stringify({
    orders: orders.map((order) => ({
      id: order.id,
      date: order.date,
      createdAt: order.createdAt,
      total: order.total,
      status: order.status,
      email: order.email,
      lineItems: order.lineItems,
    })),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      type: product.type,
      price: product.price,
    })),
  })

const isAnalyticsData = (value: unknown): value is AnalyticsData => {
  if (!value || typeof value !== "object") return false
  const data = value as Partial<AnalyticsData>
  return Array.isArray(data.salesData) && Array.isArray(data.categoryRevenue)
}

const readAnalyticsCache = (signature: string): AnalyticsCache | null => {
  try {
    const saved = localStorage.getItem(ANALYTICS_CACHE_KEY)
    if (!saved) return null
    const cache: unknown = JSON.parse(saved)
    if (
      cache &&
      typeof cache === "object" &&
      (cache as AnalyticsCache).version === 1 &&
      (cache as AnalyticsCache).signature === signature &&
      isAnalyticsData((cache as AnalyticsCache).data)
    ) {
      return cache as AnalyticsCache
    }
  } catch (error) {
    console.error(
      "Unable to read the cached admin analytics from local storage.",
      error,
    )
  }
  return null
}

const buildAnalyticsData = (
  orders: AdminOrder[],
  products: InventoryProduct[],
): AnalyticsData => {
  const productById = new Map(products.map((product) => [product.id, product]))
  const currentMonth = new Date()
  const monthBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 6 + index,
      1,
    )
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.toLocaleDateString("en", { month: "short" }),
      revenue: 0,
      orders: 0,
      customers: new Set<string>(),
    }
  })
  const bucketsByKey = new Map(
    monthBuckets.map((bucket) => [bucket.key, bucket]),
  )
  const categoryTotals = new Map(
    CATEGORIES.map((category) => [category.name, 0]),
  )
  const customerFirstOrder = new Map<string, {
    timestamp: number
    monthKey: string
  }>()

  orders
    .filter((order) => order.status !== "Cancelled")
    .forEach((order) => {
      const orderDate = new Date(order.createdAt || order.date)
      const email = order.email?.trim().toLowerCase()
      if (!email || Number.isNaN(orderDate.getTime())) return

      const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth()}`
      const timestamp = orderDate.getTime()
      const firstOrder = customerFirstOrder.get(email)
      if (!firstOrder || timestamp < firstOrder.timestamp) {
        customerFirstOrder.set(email, { timestamp, monthKey })
      }
    })

  orders
    .filter((order) => order.status !== "Cancelled")
    .forEach((order) => {
      const orderDate = new Date(order.createdAt || order.date)
      if (Number.isNaN(orderDate.getTime())) return
      const bucket = bucketsByKey.get(
        `${orderDate.getFullYear()}-${orderDate.getMonth()}`,
      )
      if (bucket) {
        bucket.revenue += order.total
        bucket.orders += 1
        const email = order.email?.trim().toLowerCase()
        if (email && customerFirstOrder.get(email)?.monthKey === bucket.key) {
          bucket.customers.add(email)
        }
      }

      order.lineItems?.forEach((item) => {
        const category = item.category || productById.get(item.productId)?.type
        if (category && categoryTotals.has(category)) {
          categoryTotals.set(
            category,
            (categoryTotals.get(category) || 0) +
              item.unitPrice * item.quantity,
          )
        }
      })
    })

  return {
    salesData: monthBuckets.map(
      ({ month, revenue, orders: count, customers }) => ({
        month,
        revenue,
        orders: count,
        customers: customers.size,
      }),
    ),
    categoryRevenue: CATEGORIES.map((category) => ({
      ...category,
      value: categoryTotals.get(category.name) || 0,
    })),
  }
}

export default function AnalyticsSection({
  orders,
  products,
}: AnalyticsSectionProps) {
  const signature = fingerprint(orders, products)
  const calculated = useMemo(
    () => buildAnalyticsData(orders, products),
    [orders, products],
  )
  const [cached, setCached] = useState<AnalyticsCache | null>(() =>
    readAnalyticsCache(signature),
  )
  const analytics = cached?.signature === signature ? cached.data : calculated
  const hasOrders = orders.some((order) => order.status !== "Cancelled")
  const totalCategoryRevenue = analytics.categoryRevenue.reduce(
    (sum, category) => sum + category.value,
    0,
  )

  useEffect(() => {
    if (cached?.signature === signature) return
    const existing = readAnalyticsCache(signature)
    if (existing) {
      if (cached?.signature !== existing.signature) setCached(existing)
      return
    }

    const next: AnalyticsCache = { version: 1, signature, data: calculated }
    try {
      localStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify(next))
      setCached(next)
    } catch (error) {
      console.error("Unable to cache admin analytics in local storage.", error)
    }
  }, [cached, calculated, signature])

  return (
    <div className="fade-in">
      <div
        className="admin-chart-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "20px 24px",
          }}
        >
          <h3
            style={{
              fontFamily: "Plus Jakarta Sans, sans-serif",
              fontSize: 15,
              fontWeight: 800,
              margin: "0 0 20px",
            }}
          >
            Monthly Revenue
          </h3>
          {hasOrders ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={analytics.salesData}>
                <defs>
                  <linearGradient
                    id="admin-revenue-gradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `KSh${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => [
                    `KSh${
                      typeof value === "number"
                        ? value.toLocaleString()
                        : (value ?? "")
                    }`,
                    "Revenue",
                  ]}
                  contentStyle={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={ACCENT}
                  strokeWidth={2.5}
                  fill="url(#admin-revenue-gradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 240,
                display: "grid",
                placeItems: "center",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              Revenue from customer orders will appear here.
            </div>
          )}
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "20px 24px",
          }}
        >
          <h3
            style={{
              fontFamily: "Plus Jakarta Sans, sans-serif",
              fontSize: 15,
              fontWeight: 800,
              margin: "0 0 20px",
            }}
          >
            Orders &amp; New Customers
          </h3>
          {hasOrders ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.salesData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="orders"
                  fill={ACCENT}
                  radius={[3, 3, 0, 0]}
                  name="Orders"
                />
                <Bar
                  dataKey="customers"
                  fill="#dbeafe"
                  radius={[3, 3, 0, 0]}
                  name="New Customers"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 240,
                display: "grid",
                placeItems: "center",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              Order and customer activity will appear here.
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: "20px 24px",
        }}
      >
        <h3
          style={{
            fontFamily: "Plus Jakarta Sans, sans-serif",
            fontSize: 15,
            fontWeight: 800,
            margin: "0 0 20px",
          }}
        >
          Category Performance
        </h3>
        {totalCategoryRevenue > 0 ? (
          <div
            className="category-performance-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            {analytics.categoryRevenue.map((category) => {
              const percentage = Math.round(
                (category.value / totalCategoryRevenue) * 100,
              )

              return (
                <div
                  key={category.name}
                  style={{
                    textAlign: "center",
                    padding: "24px 16px",
                    background: "#f8fafc",
                    borderRadius: 12,
                  }}
                >
                  <svg
                    width={70}
                    height={70}
                    viewBox="0 0 70 70"
                    style={{ marginBottom: 12 }}
                    role="img"
                    aria-label={`${category.name}: ${percentage}% of category revenue`}
                  >
                    <circle
                      cx={35}
                      cy={35}
                      r={28}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth={7}
                    />
                    <circle
                      cx={35}
                      cy={35}
                      r={28}
                      fill="none"
                      stroke={category.color}
                      strokeWidth={7}
                      strokeDasharray={`${percentage * 1.759} 175.9`}
                      strokeLinecap="round"
                      transform="rotate(-90 35 35)"
                    />
                  </svg>
                  <div
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 18,
                      fontWeight: 800,
                      color: DARK,
                    }}
                  >
                    {percentage}%
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: category.color,
                      marginTop: 2,
                    }}
                  >
                    {category.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    KSh
                    {category.value.toLocaleString("en-KE", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    revenue
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "28px 20px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            Product category revenue will appear after customers place orders.
          </div>
        )}
      </div>
    </div>
  )
}
