import { lazy, Suspense, useEffect, useState } from "react"
import Landing from "./components/Landing"
import { isAdminUser, signInAdmin } from "./lib/adminAuth"
import { supabase, supabaseConfigured } from "./lib/supabase"

const CustomerDashboard = lazy(() => import("./components/customer-dashboard"))
const AdminDashboard = lazy(() => import("./components/admin-dashboard"))
const AdminLogin = lazy(() => import("./components/admin-dashboard/AdminLogin"))

type View = "landing" | "customer" | "admin"
type AdminAuthStatus = "checking" | "signed-out" | "authorized"

function PageLoading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        color: "#64748b",
        fontSize: 14,
      }}
    >
      Loading...
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<View>("landing")
  const [adminAuthStatus, setAdminAuthStatus] =
    useState<AdminAuthStatus>("checking")
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    const client = supabase
    if (!supabaseConfigured || !client) {
      setAdminAuthStatus("signed-out")
      return
    }

    let active = true
    const subscription = client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (active) setAdminAuthStatus("signed-out")
        return
      }

      if (active) setAdminAuthStatus("checking")
      window.setTimeout(() => {
        void (async () => {
          try {
            const isAdmin = await isAdminUser()
            if (!active) return
            if (!isAdmin) {
              setAuthError(
                "This account is not enabled for the admin dashboard.",
              )
              setAdminAuthStatus("signed-out")
              const { error } = await client.auth.signOut()
              if (error) {
                setAuthError(
                  `This account is not an admin. Sign-out failed: ${error.message}`,
                )
              }
              return
            }
            setAuthError("")
            setAdminAuthStatus("authorized")
          } catch (error) {
            if (!active) return
            setAuthError(
              error instanceof Error
                ? error.message
                : "Unable to verify your Supabase session.",
            )
            setAdminAuthStatus("signed-out")
          }
        })()
      }, 0)
    })

    return () => {
      active = false
      subscription.data.subscription.unsubscribe()
    }
  }, [])

  const handleViewChange = (v: string) => {
    const client = supabase
    if (v === "landing" || v === "customer" || v === "admin") {
      if (
        view === "admin" &&
        v !== "admin" &&
        adminAuthStatus === "authorized" &&
        client
      ) {
        void (async () => {
          const { error } = await client.auth.signOut()
          if (error) {
            setAuthError(`Unable to sign out: ${error.message}`)
            return
          }
          setAuthError("")
          setAdminAuthStatus("signed-out")
          setView(v)
        })()
        return
      }
      setView(v)
    }
  }

  if (view === "customer")
    return (
      <Suspense fallback={<PageLoading />}>
        <CustomerDashboard onViewChange={handleViewChange} />
      </Suspense>
    )
  if (view === "admin") {
    if (adminAuthStatus !== "authorized") {
      return (
        <Suspense fallback={<PageLoading />}>
          <AdminLogin
            onLogin={async (email, password) => {
              await signInAdmin(email, password)
              setAuthError("")
              setAdminAuthStatus("authorized")
            }}
            onBackToStore={() => handleViewChange("landing")}
            isCheckingSession={adminAuthStatus === "checking"}
            sessionError={authError}
          />
        </Suspense>
      )
    }
    return (
      <Suspense fallback={<PageLoading />}>
        <AdminDashboard onViewChange={handleViewChange} authError={authError} />
      </Suspense>
    )
  }
  return <Landing onViewChange={handleViewChange} />
}
