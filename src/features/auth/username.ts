export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/
export const AUTH_EMAIL_DOMAIN = "users.spanishmadeeasy.invalid"
export const MIN_PASSWORD_LENGTH = 8
export const MIN_TARGET = 5
export const MAX_TARGET = 50
export const PRESET_TARGETS = [5, 10, 20, 30] as const
export const ONBOARDING_LEVELS = ["A1", "A2"] as const

export type OnboardingLevel = (typeof ONBOARDING_LEVELS)[number]
export type ProficiencyLevel = OnboardingLevel | "B1" | "B2" | "C1" | "C2"

export type Profile = {
  id: string
  username: string
  proficiency_level: ProficiencyLevel | null
  daily_learning_target: number | null
}

const TAKEN_USERNAME = "That username is already taken. Choose a different one."

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function usernameError(value: string): string | null {
  if (!USERNAME_PATTERN.test(normalizeUsername(value))) {
    return "Use 3 to 24 letters, numbers, or underscores."
  }
  return null
}

export function passwordError(value: string): string | null {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return "Use at least 8 characters."
  }
  return null
}

export function authEmailForUsername(value: string): string {
  return `${normalizeUsername(value)}@${AUTH_EMAIL_DOMAIN}`
}

export function isProfileComplete(profile: Profile): boolean {
  return profile.proficiency_level !== null && profile.daily_learning_target !== null
}

export function targetError(value: number): string | null {
  if (!Number.isInteger(value) || value < MIN_TARGET || value > MAX_TARGET) {
    return "Choose a whole number from 5 to 50."
  }
  return null
}

export function interpretSignUp(input: {
  errorMessage: string | null
  identityCount: number | null
  hasSession: boolean
}): { ok: true } | { ok: false; message: string } {
  const message = input.errorMessage ?? ""
  if (/already registered|already been registered|already exists|duplicate key/i.test(message)) {
    return { ok: false, message: TAKEN_USERNAME }
  }
  if (input.identityCount === 0) {
    return { ok: false, message: TAKEN_USERNAME }
  }
  if (input.errorMessage) {
    return { ok: false, message: input.errorMessage }
  }
  if (!input.hasSession) {
    return {
      ok: false,
      message:
        "The account was created, but email confirmation is still on. Turn it off in the Supabase dashboard, then sign in with this username.",
    }
  }
  return { ok: true }
}

export function interpretSignIn(errorMessage: string | null): string | null {
  if (!errorMessage) return null
  if (/invalid login credentials|invalid credentials/i.test(errorMessage)) {
    return "That username and password do not match."
  }
  return errorMessage
}
