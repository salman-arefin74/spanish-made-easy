import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ExerciseCard } from "./ExerciseCard.tsx"
import type { LessonExercise } from "./load.ts"

const choice: LessonExercise = {
  id: "noun-gender-understand-1",
  kind: "understand",
  prompt: "Which article goes with café?",
  choices: ["el café", "la café"],
  tokens: null,
  acceptedAnswers: ["el café"],
  translation: "the coffee",
  explanation: "Café is masculine.",
  sortOrder: 0,
}

const tiles: LessonExercise = {
  id: "querer-apply-1",
  kind: "apply",
  prompt: "Order a juice.",
  choices: null,
  tokens: ["Quiero", "un", "zumo", "jugo"],
  acceptedAnswers: ["Quiero un zumo", "Quiero un jugo"],
  translation: "I want a juice.",
  explanation: "In Spain, say zumo.",
  sortOrder: 1,
}

describe("exercise card", () => {
  it("grades a listed choice and a listed variant", () => {
    const results: boolean[] = []
    const { rerender } = render(<ExerciseCard exercise={choice} position="1 of 2" onAdvance={(correct) => results.push(correct)} />)
    fireEvent.click(screen.getByRole("button", { name: "el café" }))
    fireEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(screen.getByText("the coffee")).toBeInTheDocument()
    expect(screen.getByText("Café is masculine.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(results).toEqual([true])

    rerender(<ExerciseCard key={tiles.id} exercise={tiles} position="2 of 2" onAdvance={(correct) => results.push(correct)} />)
    fireEvent.click(screen.getByRole("button", { name: "Quiero" }))
    fireEvent.click(screen.getByRole("button", { name: "un" }))
    fireEvent.click(screen.getByRole("button", { name: "jugo" }))
    fireEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(screen.getByText("In Spain: Quiero un zumo")).toBeInTheDocument()
    expect(screen.getByText("I want a juice.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(results).toEqual([true, true])
  })

  it("shows the English when the built sentence is not listed", () => {
    render(<ExerciseCard exercise={tiles} position="1 of 1" onAdvance={() => undefined} />)
    fireEvent.click(screen.getByRole("button", { name: "Quiero" }))
    fireEvent.click(screen.getByRole("button", { name: "un" }))
    fireEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(screen.getByText("That is not one of the listed answers.")).toBeInTheDocument()
    expect(screen.getByText("Quiero un zumo")).toBeInTheDocument()
    expect(screen.getByText("I want a juice.")).toBeInTheDocument()
  })
})
