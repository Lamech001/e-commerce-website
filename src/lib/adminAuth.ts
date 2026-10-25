import { supabase, supabaseConfigured } from "./supabase"

const configurationError =
  "Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."

const getSupabase = () => {
  if (!supabaseConfigured || !supabase) throw new Error(configurationError)
  return supabase
}

export const isAdminUser = async () => {
  const client = getSupabase()
  const { data, error } = await client.rpc("is_admin")
  if (error) throw new Error(`Unable to verify admin access: ${error.message}`)
  return data === true
}

export const signInAdmin = async (email: string, password: string) => {
  const client = getSupabase()
  let result: Awaited<ReturnType<typeof client.auth.signInWithPassword>>
  try {
    result = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
  } catch (error) {
    if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
      throw new Error(
        "Could not reach Supabase Authentication. Check your internet connection, refresh the app, and verify its Supabase project URL and publishable key.",
      )
    }
    throw error
  }

  const { data, error } = result

  if (error) {
    if (/email logins are disabled/i.test(error.message)) {
      throw new Error(
        "Email/password sign-in is disabled in this Supabase project. In Authentication → Sign In / Providers, enable the Email provider but keep user sign-ups disabled.",
      )
    }
    throw new Error(error.message)
  }
  if (!data.user)
    throw new Error("Supabase did not return an authenticated user.")

  let isAdmin = false
  try {
    isAdmin = await isAdminUser()
  } catch (verificationError) {
    const { error: signOutError } = await client.auth.signOut()
    if (signOutError) {
      const message =
        verificationError instanceof Error
          ? verificationError.message
          : "Admin access verification failed."
      throw new Error(
        `${message} Sign-out also failed: ${signOutError.message}`,
      )
    }
    throw verificationError
  }

  if (!isAdmin) {
    const { error: signOutError } = await client.auth.signOut()
    if (signOutError) {
      throw new Error(
        `This account is not an admin, and sign-out failed: ${signOutError.message}`,
      )
    }
    throw new Error("This account is not enabled for the admin dashboard.")
  }
}
