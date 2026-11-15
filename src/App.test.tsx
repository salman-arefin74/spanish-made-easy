import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { App } from "./App.tsx"

const labels = [
  "Progress",
  "Vocabulary",
  "Sentence Builder",
  "Revision",
  "Exams",
  "Real-Life Spanish",
]

describe("application shell", () => {
  it("shows the six sections", () => {
    render(<App />)
    for (const label of labels) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument()
    }
  })

  it("keeps the phone bar and the desktop side nav on one navigation landmark", () => {
    render(<App />)
    const nav = screen.getByRole("navigation", { name: "Primary" })
    expect(nav.className).toContain("bottom-0")
    expect(nav.className).toContain("md:w-60")
  })

  it("does not invent progress on the progress page", () => {
    render(<App />)
    expect(screen.getByRole("heading", { level: 1, name: "Progress" })).toBeInTheDocument()
    expect(screen.getByText(/not built yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("opens a section without showing sample study data", async () => {
    render(<App />)
    screen.getByRole("link", { name: "Vocabulary" }).click()
    expect(
      await screen.findByRole("heading", { level: 1, name: "Vocabulary" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/flashcards and the word bank are not available/i)).toBeInTheDocument()
  })
})
