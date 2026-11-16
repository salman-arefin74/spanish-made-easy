import { describe, expect, it } from "vitest"
import {
  authEmailForUsername,
  interpretSignIn,
  interpretSignUp,
  isProfileComplete,
  normalizeUsername,
  passwordError,
  targetError,
  usernameError,
  type Profile,
} from "./username.ts"

const profile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "user-1",
  username: "ana",
  proficiency_level: null,
  daily_learning_target: null,
  ...overrides,
})

describe("username accounts", () => {
  it("treats Ana and ana as the same username", () => {
    expect(normalizeUsername("  Ana ")).toBe("ana")
    expect(authEmailForUsername("Ana")).toBe("ana@users.spanishmadeeasy.invalid")
  })

  it("rejects usernames outside 3 to 24 letters, numbers, and underscores", () => {
    expect(usernameError("ab")).toMatch(/3 to 24/)
    expect(usernameError("ana.maria")).toMatch(/3 to 24/)
    expect(usernameError("learner_1")).toBeNull()
  })

  it("rejects passwords shorter than 8 characters", () => {
    expect(passwordError("short")).toMatch(/8/)
    expect(passwordError("long-enough")).toBeNull()
  })

  it("maps an existing account to the taken-username message", () => {
    expect(
      interpretSignUp({
        errorMessage: "User already registered",
        identityCount: null,
        hasSession: false,
      }),
    ).toEqual({
      ok: false,
      message: "That username is already taken. Choose a different one.",
    })
  })

  it("maps an empty identity list to the taken-username message", () => {
    expect(
      interpretSignUp({
        errorMessage: null,
        identityCount: 0,
        hasSession: false,
      }),
    ).toEqual({
      ok: false,
      message: "That username is already taken. Choose a different one.",
    })
  })

  it("tells the learner to turn off email confirmation when no session comes back", () => {
    const result = interpretSignUp({
      errorMessage: null,
      identityCount: 1,
      hasSession: false,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/email confirmation/i)
    }
  })

  it("accepts a sign-up that returns a session", () => {
    expect(
      interpretSignUp({
        errorMessage: null,
        identityCount: 1,
        hasSession: true,
      }),
    ).toEqual({ ok: true })
  })

  it("does not say which sign-in field was wrong", () => {
    expect(interpretSignIn("Invalid login credentials")).toBe(
      "That username and password do not match.",
    )
  })

  it("keeps a profile incomplete until level and target are both set", () => {
    expect(isProfileComplete(profile())).toBe(false)
    expect(isProfileComplete(profile({ proficiency_level: "A1" }))).toBe(false)
    expect(
      isProfileComplete(profile({ proficiency_level: "A2", daily_learning_target: 10 })),
    ).toBe(true)
  })

  it("accepts only whole daily targets from 5 to 50", () => {
    expect(targetError(4)).toMatch(/5 to 50/)
    expect(targetError(10.5)).toMatch(/5 to 50/)
    expect(targetError(50)).toBeNull()
  })
})
