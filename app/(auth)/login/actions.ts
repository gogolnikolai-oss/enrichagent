'use server'

import { redirect } from 'next/navigation'
import { d1, UserRecord } from '@/lib/d1'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createSessionCookie, destroySessionCookie } from '@/lib/auth/session'

export async function login(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=Email+and+password+are+required')
  }

  const user = await d1
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<UserRecord>()

  if (!user || !user.password_hash) {
    redirect('/login?error=Invalid+email+or+password')
  }

  const isValid = await verifyPassword(password, user.password_hash)
  if (!isValid) {
    redirect('/login?error=Invalid+email+or+password')
  }

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    tier: user.tier,
  })

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/signup?error=Email+and+password+are+required')
  }

  if (password.length < 6) {
    redirect('/signup?error=Password+must+be+at+least+6+characters')
  }

  const existing = await d1
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string }>()

  if (existing) {
    redirect('/signup?error=An+account+with+this+email+already+exists')
  }

  const hashedPassword = await hashPassword(password)
  const userId = crypto.randomUUID()
  const apiKey = `ea_${crypto.randomUUID().replace(/-/g, '')}`

  await d1
    .prepare(
      `INSERT INTO users (id, email, password_hash, api_key, credits_balance, tier)
       VALUES (?, ?, ?, ?, 25, 'free')`
    )
    .bind(userId, email, hashedPassword, apiKey)
    .run()

  await createSessionCookie({
    userId,
    email,
    tier: 'free',
  })

  redirect('/dashboard')
}

export async function signInWithGoogle() {
  redirect('/api/auth/google')
}

export async function logout() {
  await destroySessionCookie()
  redirect('/login')
}
