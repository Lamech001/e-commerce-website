import { useEffect, useState } from "react"
import { Trash2, ShoppingBag, Edit2, Send } from "lucide-react"
import { chatMessages } from "../../data/mockData"
import { loadCustomerProfile, saveCustomerProfile } from "../../data/localStore"
import {
  cancelCustomerOrderRemote,
  fetchCustomerOrders,
  updateCustomerProfileRemote,
} from "../../data/supabaseStore"
import CustomerAccountPrompt from "./CustomerAccountPrompt"
import CustomerOverview from "./CustomerOverview"
import CustomerSidebar from "./CustomerSidebar"
import { ACCENT, DARK, ORDER_STATUS_COLORS } from "./constants"
import type {
  CustomerSection,
  CustomerStat,
  StoredCustomer,
  StoredOrder,
} from "./types"

interface Props {
  onViewChange: (v: string) => void
}

export default function CustomerDashboard({ onViewChange }: Props) {
  const [customer, setCustomer] = useState<StoredCustomer | null>(
    loadCustomerProfile,
  )
  const [section, setSection] = useState<CustomerSection>("overview")
  const [messages, setMessages] = useState(chatMessages)
  const [newMsg, setNewMsg] = useState("")
  const [wishlist, setWishlist] =
    useState<typeof import("../../data/mockData").wishlistItems>([])
  const [editProfile, setEditProfile] = useState(false)
  const [typing, setTyping] = useState(false)
  const [cancelError, setCancelError] = useState("")
  const [profileError, setProfileError] = useState("")
  const [profileSaved, setProfileSaved] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [profile, setProfile] = useState({
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    city: customer?.city || "",
    postcode: customer?.postcode || "",
  })
  const [savedProfile, setSavedProfile] = useState(profile)
  const [customerOrders, setCustomerOrders] = useState<StoredOrder[]>([])

  useEffect(() => {
    const accessToken = localStorage.getItem("nelz-customer-order-access")
    if (!customer || !accessToken) return
    let active = true
    setIsLoadingOrders(true)
    void fetchCustomerOrders(customer.email, accessToken)
      .then((orders) => {
        if (!active) return
        setCustomerOrders(
          orders.map((order) => ({
            ...order,
            statusColor: ORDER_STATUS_COLORS[order.status] || "#64748b",
          })),
        )
        setCancelError("")
      })
      .catch((error: unknown) => {
        if (!active) return
        console.error("Unable to load customer orders from Supabase.", error)
        setCancelError(
          error instanceof Error
            ? error.message
            : "Unable to load your orders.",
        )
      })
      .finally(() => {
        if (active) setIsLoadingOrders(false)
      })
    return () => {
      active = false
    }
  }, [customer])

  const saveProfile = async () => {
    if (!customer) return
    if (
      !profile.name.trim() ||
      !profile.email.trim() ||
      !profile.phone.trim() ||
      !profile.address.trim() ||
      !profile.city.trim()
    ) {
      setProfileError("Name, email, phone, address, and city are required.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      setProfileError("Enter a valid email address.")
      return
    }

    const accessToken = localStorage.getItem("nelz-customer-order-access")
    if (!accessToken) {
      setProfileError(
        "This device is missing the secure order access token. Your profile could not be updated.",
      )
      return
    }

    setIsSavingProfile(true)
    setProfileError("")
    setProfileSaved(false)
    try {
      const updatedCustomer = {
        ...profile,
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
        city: profile.city.trim(),
        postcode: profile.postcode.trim(),
      }
      await updateCustomerProfileRemote({
        email: customer.email,
        accessToken,
        customer: {
          fullName: updatedCustomer.name,
          email: updatedCustomer.email,
          phone: updatedCustomer.phone,
          address: updatedCustomer.address,
          city: updatedCustomer.city,
          postcode: updatedCustomer.postcode,
        },
      })
      const updatedStoredCustomer = {
        ...updatedCustomer,
        createdAt: customer.createdAt,
      }
      saveCustomerProfile(updatedStoredCustomer)
      setCustomer(updatedStoredCustomer)
      setProfile(updatedCustomer)
      setSavedProfile(updatedCustomer)
      setEditProfile(false)
      setProfileSaved(true)
    } catch (error) {
      console.error("Unable to save customer profile.", error)
      setProfileError(
        error instanceof Error
          ? error.message
          : "Unable to save your profile. Please try again.",
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  const sendMessage = () => {
    if (!newMsg.trim()) return
    const msg = {
      id: messages.length + 1,
      from: "user" as const,
      name: "You",
      message: newMsg,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      avatar: "S",
    }
    setMessages((prev) => [...prev, msg])
    setNewMsg("")
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          from: "agent",
          name: "Léa · Style Advisor",
          message:
            "Thanks for your message! I'm checking that right now and will get back to you in just a moment.",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          avatar: "L",
        },
      ])
    }, 1800)
  }

  const totalSpent = customerOrders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + order.total, 0)
  const stylePoints = Math.floor(totalSpent / 100)
  const stats: CustomerStat[] = [
    {
      label: "Orders",
      value: String(customerOrders.length),
      sub: "All time",
      color: "#dbeafe",
      accent: ACCENT,
    },
    {
      label: "Total Spent",
      value: `KSh ${totalSpent.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: "Non-cancelled orders",
      color: "#d1fae5",
      accent: "#059669",
    },
    {
      label: "Saved Items",
      value: String(wishlist.length),
      sub: "Wishlist",
      color: "#fce7f3",
      accent: "#db2777",
    },
    {
      label: "Style Points",
      value: stylePoints.toLocaleString(),
      sub: `≈ KSh ${(stylePoints / 100).toFixed(2)} credit`,
      color: "#fef3c7",
      accent: "#d97706",
    },
  ]

  const cancelOrder = async (id: string) => {
    const order = customerOrders.find((item) => item.id === id)
    const accessToken = localStorage.getItem("nelz-customer-order-access")
    if (!order || order.status !== "Pending" || !customer || !accessToken)
      return

    try {
      await cancelCustomerOrderRemote({
        email: customer.email,
        accessToken,
        orderNumber: id,
      })
      setCustomerOrders((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "Cancelled",
                statusColor: ORDER_STATUS_COLORS.Cancelled,
              }
            : item,
        ),
      )
      setCancelError("")
    } catch (error) {
      console.error(
        "Unable to cancel the order and restore its inventory.",
        error,
      )
      setCancelError(
        error instanceof Error
          ? error.message
          : "The order could not be cancelled. Please try again.",
      )
    }
  }

  if (!customer) {
    return <CustomerAccountPrompt onViewChange={onViewChange} />
  }

  return (
    <div
      className="dashboard-shell customer-dashboard"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <CustomerSidebar
        profileName={profile.name}
        wishlistCount={wishlist.length}
        section={section}
        onSectionChange={setSection}
        onViewChange={onViewChange}
      />

      {/* Main */}
      <main
        className="dashboard-main"
        style={{
          flex: 1,
          padding: "36px 44px",
          minWidth: 0,
          overflowY: "auto",
        }}
      >
        {section === "overview" && (
          <CustomerOverview
            customerName={profile.name}
            stats={stats}
            customerOrders={customerOrders}
            wishlist={wishlist}
            onSectionChange={setSection}
          />
        )}

        {/* ── Orders ── */}
        {section === "orders" && (
          <div className="fade-in">
            <h1
              style={{
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: DARK,
                margin: "0 0 28px",
                letterSpacing: "-0.5px",
              }}
            >
              Order History
            </h1>
            {cancelError && (
              <div
                role="alert"
                style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  background: "#fee2e2",
                  borderRadius: 8,
                  color: "#b91c1c",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {cancelError}
              </div>
            )}
            {isLoadingOrders && (
              <p role="status" style={{ color: "#64748b", fontSize: 13 }}>
                Loading your orders...
              </p>
            )}
            {!isLoadingOrders &&
              !cancelError &&
              customerOrders.length === 0 && (
                <p style={{ color: "#64748b", fontSize: 13 }}>
                  No orders are linked to this browser yet.
                </p>
              )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {customerOrders.map((o) => (
                <div
                  key={o.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: "20px 24px",
                  }}
                >
                  <div
                    className="customer-order-head"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{ display: "flex", gap: 14, alignItems: "center" }}
                    >
                      <img
                        src={o.image}
                        alt=""
                        style={{
                          width: 56,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 10,
                          background: "#f1f5f9",
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 14,
                              fontWeight: 700,
                              color: DARK,
                            }}
                          >
                            {o.id}
                          </span>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              color: o.statusColor,
                              background: o.statusColor + "18",
                              padding: "3px 10px",
                              borderRadius: 10,
                            }}
                          >
                            {o.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>
                          {o.date} · {o.items} item{o.items > 1 ? "s" : ""}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 8,
                          }}
                        >
                          {o.products.map((p) => (
                            <span
                              key={p}
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                padding: "3px 10px",
                                borderRadius: 6,
                              }}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontFamily: "Plus Jakarta Sans, sans-serif",
                          fontSize: 20,
                          fontWeight: 800,
                          color: DARK,
                        }}
                      >
                        KSh{o.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {o.status === "Delivered" && (
                      <button
                        style={{
                          padding: "6px 14px",
                          background: "#eff6ff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: ACCENT,
                        }}
                      >
                        Buy Again
                      </button>
                    )}
                    {o.status === "Shipped" && (
                      <button
                        style={{
                          padding: "6px 14px",
                          background: "#dbeafe",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: ACCENT,
                        }}
                      >
                        Track Parcel
                      </button>
                    )}
                    {o.status === "Processing" && (
                      <button
                        style={{
                          padding: "6px 14px",
                          background: "#fef3c7",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "#d97706",
                        }}
                      >
                        View Details
                      </button>
                    )}
                    {o.status === "Delivered" && (
                      <button
                        style={{
                          padding: "6px 14px",
                          background: "#f1f5f9",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "#64748b",
                        }}
                      >
                        Leave Review
                      </button>
                    )}
                    {o.status === "Pending" && (
                      <button
                        onClick={() => void cancelOrder(o.id)}
                        style={{
                          padding: "6px 14px",
                          background: "none",
                          border: "1px solid #fee2e2",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "#dc2626",
                        }}
                      >
                        Cancel Order
                      </button>
                    )}
                    <button
                      style={{
                        padding: "6px 14px",
                        background: "#f1f5f9",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      Invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Wishlist ── */}
        {section === "wishlist" && (
          <div className="fade-in">
            <h1
              style={{
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: DARK,
                margin: "0 0 28px",
                letterSpacing: "-0.5px",
              }}
            >
              Saved Items ({wishlist.length})
            </h1>
            <div
              className="wishlist-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 18,
              }}
            >
              {wishlist.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      paddingTop: "120%",
                      background: "#f8fafc",
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <button
                      onClick={() =>
                        setWishlist((prev) =>
                          prev.filter((w) => w.id !== item.id),
                        )
                      }
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 30,
                        height: 30,
                        background: "rgba(255,255,255,0.95)",
                        border: "none",
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    >
                      <Trash2 size={13} color="#dc2626" />
                    </button>
                    {!item.inStock && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.45)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 800,
                            background: "rgba(0,0,0,0.5)",
                            padding: "6px 14px",
                            borderRadius: 20,
                          }}
                        >
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "14px 16px" }}>
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
                      {item.brand}
                    </p>
                    <h3
                      style={{
                        fontFamily: "Plus Jakarta Sans, sans-serif",
                        fontSize: 14,
                        fontWeight: 800,
                        color: DARK,
                        margin: "0 0 8px",
                        lineHeight: 1.3,
                      }}
                    >
                      {item.name}
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 6,
                        marginBottom: 12,
                      }}
                    >
                      <span
                        style={{ fontSize: 17, fontWeight: 800, color: DARK }}
                      >
                        KSh{item.price.toFixed(2)}
                      </span>
                      {item.originalPrice && (
                        <span
                          style={{
                            fontSize: 12.5,
                            color: "#94a3b8",
                            textDecoration: "line-through",
                          }}
                        >
                          KSh{item.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      disabled={!item.inStock}
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: item.inStock ? ACCENT : "#e2e8f0",
                        color: item.inStock ? "#fff" : "#94a3b8",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13.5,
                        fontWeight: 800,
                        cursor: item.inStock ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 7,
                      }}
                    >
                      <ShoppingBag size={14} />
                      {item.inStock ? "Add to Cart" : "Notify Me"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Profile ── */}
        {section === "profile" && (
          <div className="fade-in">
            <h1
              style={{
                fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: DARK,
                margin: "0 0 28px",
                letterSpacing: "-0.5px",
              }}
            >
              Profile & Settings
            </h1>
            <div
              className="dashboard-two-col"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              {/* Personal Info */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "24px",
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
                  <h3
                    style={{
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontSize: 15,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    Personal Info
                  </h3>
                  <button
                    onClick={() => {
                      if (editProfile) {
                        setProfile(savedProfile)
                        setProfileError("")
                        setProfileSaved(false)
                      }
                      setEditProfile(!editProfile)
                    }}
                    disabled={isSavingProfile}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      background: editProfile ? "#eff6ff" : "#f1f5f9",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: editProfile ? ACCENT : "#64748b",
                    }}
                  >
                    <Edit2 size={12} /> {editProfile ? "Cancel" : "Edit"}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 24,
                    padding: "14px",
                    background: "#f8fafc",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      background: "#dbeafe",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      color: ACCENT,
                      flexShrink: 0,
                    }}
                  >
                    S
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: DARK }}>
                      {profile.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "#d97706",
                        fontWeight: 700,
                      }}
                    >
                      Member since{" "}
                      {new Date(customer.createdAt).toLocaleDateString(
                        "en-KE",
                        { month: "short", year: "numeric" },
                      )}
                    </div>
                  </div>
                </div>
                {(Object.entries(profile) as [string, string][]).map(
                  ([key, val]) => (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "block",
                          marginBottom: 5,
                        }}
                      >
                        {key === "name"
                          ? "Full Name"
                          : key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      {editProfile ? (
                        <input
                          type={key === "email" ? "email" : "text"}
                          value={val}
                          onChange={(e) => {
                            setProfile((p) => ({
                              ...p,
                              [key]: e.target.value,
                            }))
                            setProfileError("")
                            setProfileSaved(false)
                          }}
                          required={key !== "postcode"}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            border: `1.5px solid ${ACCENT}`,
                            borderRadius: 8,
                            fontSize: 13.5,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: 13.5,
                            color: DARK,
                            fontWeight: 500,
                          }}
                        >
                          {val}
                        </div>
                      )}
                    </div>
                  ),
                )}
                {profileError && (
                  <p
                    role="alert"
                    style={{
                      margin: "4px 0 8px",
                      color: "#b91c1c",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                    }}
                  >
                    {profileError}
                  </p>
                )}
                {profileSaved && (
                  <p
                    role="status"
                    style={{
                      margin: "4px 0 8px",
                      color: "#15803d",
                      fontSize: 12.5,
                    }}
                  >
                    Your profile has been saved.
                  </p>
                )}
                {editProfile && (
                  <button
                    onClick={() => void saveProfile()}
                    disabled={isSavingProfile}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "10px",
                      background: ACCENT,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: isSavingProfile ? "wait" : "pointer",
                      opacity: isSavingProfile ? 0.7 : 1,
                    }}
                  >
                    {isSavingProfile ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {/* Security */}
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
                      margin: "0 0 16px",
                    }}
                  >
                    Security
                  </h3>
                  {[
                    { label: "Password", sub: "Changed 3 months ago" },
                    {
                      label: "Two-Factor Auth",
                      sub: "Not enabled — recommended",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: DARK,
                          }}
                        >
                          {item.label}
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          {item.sub}
                        </div>
                      </div>
                      <button
                        style={{
                          padding: "5px 12px",
                          background: "#f1f5f9",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: "#475569",
                          cursor: "pointer",
                        }}
                      >
                        Update
                      </button>
                    </div>
                  ))}
                </div>

                {/* Notifications */}
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
                      margin: "0 0 16px",
                    }}
                  >
                    Notifications
                  </h3>
                  {[
                    { label: "Order & shipping updates", on: true },
                    { label: "New arrivals & restocks", on: true },
                    { label: "Sale alerts & promotions", on: true },
                    { label: "Style newsletter", on: false },
                  ].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                      }}
                    >
                      <span style={{ fontSize: 13.5, color: DARK }}>
                        {item.label}
                      </span>
                      <div
                        style={{
                          width: 38,
                          height: 22,
                          background: item.on ? ACCENT : "#e2e8f0",
                          borderRadius: 11,
                          position: "relative",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: 3,
                            left: item.on ? 19 : 3,
                            width: 16,
                            height: 16,
                            background: "#fff",
                            borderRadius: "50%",
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment */}
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
                      margin: "0 0 14px",
                    }}
                  >
                    Payment Methods
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 30,
                        background: "#1a1a2e",
                        borderRadius: 5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{ fontSize: 10, color: "#fff", fontWeight: 800 }}
                      >
                        VISA
                      </span>
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: DARK,
                        }}
                      >
                        •••• •••• •••• 4242
                      </div>
                      <div style={{ fontSize: 11.5, color: "#94a3b8" }}>
                        Expires 11/29
                      </div>
                    </div>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#16a34a",
                        background: "#dcfce7",
                        padding: "2px 8px",
                        borderRadius: 10,
                      }}
                    >
                      Default
                    </span>
                  </div>
                  <button
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      color: ACCENT,
                      fontWeight: 700,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    + Add payment method
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Support Chat ── */}
        {section === "support" && (
          <div
            className="fade-in support-chat"
            style={{
              height: "calc(100vh - 72px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h1
                style={{
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                  fontSize: 26,
                  fontWeight: 800,
                  color: DARK,
                  margin: "0 0 4px",
                  letterSpacing: "-0.5px",
                }}
              >
                Style Support
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
                Our advisors reply within 2 minutes
              </p>
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                maxHeight: 580,
              }}
            >
              {/* Chat header */}
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    background: ACCENT,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  L
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: DARK }}>
                    Léa · Style Advisor
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#16a34a",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        background: "#16a34a",
                        borderRadius: "50%",
                        display: "inline-block",
                      }}
                    />
                    Online — responds in 2 min
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection:
                        msg.from === "user" ? "row-reverse" : "row",
                      gap: 10,
                      alignItems: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        background: msg.from === "user" ? "#dbeafe" : ACCENT,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: msg.from === "user" ? ACCENT : "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {msg.avatar}
                    </div>
                    <div style={{ maxWidth: "72%" }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          marginBottom: 4,
                          textAlign: msg.from === "user" ? "right" : "left",
                          fontWeight: 500,
                        }}
                      >
                        {msg.name} · {msg.time}
                      </div>
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius:
                            msg.from === "user"
                              ? "14px 14px 4px 14px"
                              : "14px 14px 14px 4px",
                          background: msg.from === "user" ? ACCENT : "#f1f5f9",
                          color: msg.from === "user" ? "#fff" : DARK,
                          fontSize: 13.5,
                          lineHeight: 1.6,
                        }}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))}
                {typing && (
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        background: ACCENT,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      L
                    </div>
                    <div
                      style={{
                        padding: "10px 16px",
                        background: "#f1f5f9",
                        borderRadius: "14px 14px 14px 4px",
                        fontSize: 13.5,
                      }}
                    >
                      <span style={{ display: "inline-flex", gap: 3 }}>
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            style={{
                              width: 6,
                              height: 6,
                              background: "#94a3b8",
                              borderRadius: "50%",
                              display: "inline-block",
                              animation: `bounce 1s ${i * 0.15}s infinite`,
                            }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div
                style={{
                  padding: "14px 16px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  gap: 10,
                }}
              >
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message…"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 24,
                    fontSize: 13.5,
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = ACCENT)}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    width: 42,
                    height: 42,
                    background: ACCENT,
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#1d4ed8")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = ACCENT)
                  }
                >
                  <Send size={16} color="#fff" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
