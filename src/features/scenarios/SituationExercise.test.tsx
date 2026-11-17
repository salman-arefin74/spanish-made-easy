import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SituationExerciseCard, type SituationExercise } from "./SituationExercise.tsx"

const question: SituationExercise = {
  id: "meeting-someone-end",
  kind: "comprehension",
  prompt: "Which line do they say at the end?",
  choices: ["Hasta luego.", "Hola, buenos días.", "Me llamo Ana."],
  tokens: null,
  acceptedAnswers: ["Hasta luego."],
  translation: "See you later.",
  explanation: "Hasta luego means see you later.",
}

describe("situation exercise", () => {
  it("checks a listed comprehension answer", () => {
    const answers: boolean[] = []
    render(<SituationExerciseCard exercise={question} position="1 of 6" onAdvance={(correct) => answers.push(correct)} />)
    fireEvent.click(screen.getByRole("button", { name: "Hasta luego." }))
    fireEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(screen.getByText("See you later.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(answers).toEqual([true])
  })
})
