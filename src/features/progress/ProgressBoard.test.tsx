import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { ProgressView } from "./ProgressBoard.tsx"
import { buildBoard } from "./stats.ts"

describe("progress page", () => {
  it("explains why a studied word can still show as unknown", () => {
    const figures = buildBoard({
      words: [{ id: "hola", level: "A1" }],
      progress: [],
      studyDays: [],
      topics: [],
      exams: [],
      situations: [],
      today: "2026-11-17",
      dailyTarget: 10,
    })
    render(
      <MemoryRouter>
        <ProgressView figures={figures} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/will not see it again for a week/i)).toBeInTheDocument()
    expect(screen.getByText(/comes back tomorrow/i)).toBeInTheDocument()
    expect(screen.getByText(/situations are not loaded yet/i)).toBeInTheDocument()
  })
})
