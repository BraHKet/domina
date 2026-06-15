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
    await supabase.auth.signOut()
  } catch (e) {
    console.log('Logout failed')
    console.error('Logout exception:', e)
  }
}

export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}