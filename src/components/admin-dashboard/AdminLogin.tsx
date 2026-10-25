import { useState } from "react"
import { LockKeyhole } from "lucide-react"
import { ACCENT, DARK } from "./constants"

interface AdminLoginProps {
  onLogin: (email: string, password: string) => Promise<void>
  onBackToStore: () => void
  isCheckingSession: boolean
  sessionError: string
}

export default function AdminLogin({
  onLogin,
  onBackToStore,
  isCheckingSession,
  sessionError,
}: AdminLoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await onLogin(email, password)
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "#f8fafc",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 32,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          boxShadow: "0 16px 48px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            display: "grid",
            placeItems: "center",
            marginBottom: 20,
            background: "#eff6ff",
            borderRadius: 12,
            color: ACCENT,
          }}
        >
          <LockKeyhole size={23} />
        </div>
        <div
          style={{
            marginBottom: 6,
            fontFamily: "Plus Jakarta Sans, sans-serif",
            fontSize: 22,
            fontWeight: 800,
            color: DARK,
          }}
        >
          Admin sign in
        </div>
        <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 13.5 }}>
          Sign in to continue to the Nelzcollections admin dashboard.
        </p>

        <label
          htmlFor="admin-login-email"
          style={{
            display: "block",
            marginBottom: 6,
            color: "#475569",
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          Email
        </label>
        <input
          id="admin-login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          style={{
            width: "100%",
            minHeight: 44,
            marginBottom: 16,
            padding: "10px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />

        <label
          htmlFor="admin-login-password"
          style={{
            display: "block",
            marginBottom: 6,
            color: "#475569",
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          Password
        </label>
        <input
          id="admin-login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          style={{
            width: "100%",
            minHeight: 44,
            marginBottom: 20,
            padding: "10px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />

        <button
          type="submit"
          disabled={isSubmitting || isCheckingSession}
          style={{
            width: "100%",
            minHeight: 46,
            padding: "11px 16px",
            background: ACCENT,
            border: 0,
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            cursor: isSubmitting || isCheckingSession ? "wait" : "pointer",
            opacity: isSubmitting || isCheckingSession ? 0.7 : 1,
          }}
        >
          {isCheckingSession
            ? "Checking session..."
            : isSubmitting
              ? "Signing in..."
              : "Sign In"}
        </button>

        {(error || sessionError) && (
          <p
            role="alert"
            style={{
              margin: "14px 0 0",
              color: "#b91c1c",
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            {error || sessionError}
          </p>
        )}

        <button
          type="button"
          onClick={onBackToStore}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "8px 12px",
            background: "transparent",
            border: 0,
            color: "#475569",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Back to Store
        </button>

        <p
          role="note"
          style={{
            margin: "18px 0 0",
            padding: 10,
            background: "#fffbeb",
            borderRadius: 8,
            color: "#92400e",
            fontSize: 11.5,
            lineHeight: 1.6,
          }}
        >
          Only users added in Supabase Authentication can access Admin. Public
          sign-up is disabled; new Auth users are granted the Admin role.
        </p>
      </form>
    </main>
  )
}
