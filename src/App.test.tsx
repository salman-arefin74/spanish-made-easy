import { cleanup, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { App } from "./App.tsx"

vi.mock("./lib/supabase/client.ts", () => ({
  getSupabase: () => null,
  turnstileSiteKey: () => null,
}))
import type { AuthState } from "./features/auth/RequireAuth.tsx"

const labels = [
  "Progress",
  "Vocabulary",
  "Sentence Builder",
  "Revision",
  "Exams",
  "Real-Life Spanish",
]

const readyLearner: AuthState = {
  status: "ready",
  configured: true,
  userId: "user-1",
  profile: {
    id: "user-1",
    username: "ana",
    proficiency_level: "A1",
    daily_learning_target: 10,
  },
}

describe("application shell", () => {
  it("shows the six sections after sign-in", () => {
    render(<App initialAuth={readyLearner} />)
    for (const label of labels) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument()
    }
  })

  it("keeps the phone bar and the desktop side nav on one navigation landmark", () => {
    render(<App initialAuth={readyLearner} />)
    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(nav.className).toContain("bottom-0")
    expect(nav.className).toContain("md:w-60")
  })

  it("does not invent progress on the progress page", () => {
    render(<App initialAuth={readyLearner} />)
    expect(screen.getByRole("heading", { level: 1, name: "Progress" })).toBeInTheDocument()
    expect(screen.getByText(/does not show sample scores/i)).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/learn your first words/i)).not.toBeInTheDocument()
  })

  it("opens a section without showing sample study data", async () => {
    render(<App initialAuth={readyLearner} />)
    screen.getByRole("link", { name: "Vocabulary" }).click()
    expect(
      await screen.findByRole("heading", { level: 1, name: "Vocabulary" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/does not show sample words/i)).toBeInTheDocument()
  })

  it("opens sentence builder without sample sentences", async () => {
    render(<App initialAuth={readyLearner} />)
    screen.getByRole("link", { name: "Sentence Builder" }).click()
    expect(await screen.findByRole("heading", { level: 1, name: "Sentence Builder" })).toBeInTheDocument()
    expect(screen.getByText(/does not show sample sentences/i)).toBeInTheDocument()
    expect(screen.queryByText(/not built yet/i)).not.toBeInTheDocument()
  })

  it("asks a signed-out visitor to sign in before the study sections", async () => {
    render(<App />)
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Progress" })).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: /email/i })).not.toBeInTheDocument()
  })

  it("warns that a forgotten password cannot be reset", async () => {
    render(<App />)
    const links = await screen.findAllByRole("link", { name: "Create account" })
    links[0]?.click()
    expect(await screen.findByRole("heading", { name: "Create account" })).toBeInTheDocument()
    expect(screen.getByText(/forgotten password cannot be reset/i)).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: /email/i })).not.toBeInTheDocument()
  })

  it("explains a missing profile instead of leaving the sign-in form in place", () => {
    const missingProfile: AuthState = {
      status: "profile-missing",
      configured: true,
      userId: "user-1",
      profile: null,
    }
    for (const path of ["/sign-up", "/sign-in"]) {
      window.history.pushState({}, "", path)
      render(<App initialAuth={missingProfile} />)
      expect(screen.getByRole("heading", { name: "Account incomplete" })).toBeInTheDocument()
      expect(screen.getByText(/profiles table/i)).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Create account" })).not.toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Sign in" })).not.toBeInTheDocument()
      expect(screen.getAllByRole("button", { name: "Sign out" }).length).toBeGreaterThan(0)
      cleanup()
    }
    window.history.pushState({}, "", "/")
  })
})
