import { supabase } from './supabase'

export async function loginGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Logout error:', error)
  } catch (e) {
    console.error('Logout exception:', e)
  }
}

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}