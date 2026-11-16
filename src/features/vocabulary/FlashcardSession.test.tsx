import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { FlashcardSession } from "./FlashcardSession.tsx"
import type { StudyWord } from "./bank.ts"

const hola: StudyWord = {
  id: "everyday-essentials-hola",
  categoryId: "everyday-essentials",
  spanish: "hola",
  english: "hello",
  partOfSpeech: "interjection",
  level: "A1",
  exampleSpanish: "Hola, me llamo Ana.",
  exampleEnglish: "Hello, my name is Ana.",
  article: null,
  plural: null,
  spainNote: null,
  sortOrder: 0,
}

const gracias: StudyWord = {
  ...hola,
  id: "everyday-essentials-gracias",
  spanish: "gracias",
  english: "thank you",
  exampleSpanish: "Gracias por el café.",
  exampleEnglish: "Thank you for the coffee.",
  sortOrder: 1,
}

describe("flashcard session", () => {
  it("hides the meaning, brings a still-learning card back once, and then lists the words", async () => {
    const saved: string[] = []
    render(
      <MemoryRouter>
        <FlashcardSession
          title="Today's words"
          words={[hola, gracias]}
          onRecord={async (word, answer) => {
            saved.push(`${word.spanish}:${answer}`)
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { name: "hola" })).toBeInTheDocument()
    expect(screen.queryByText("hello")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Show meaning" }))
    expect(await screen.findByText("hello")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Still learning" }))

    expect(await screen.findByRole("heading", { name: "gracias" })).toBeInTheDocument()
    expect(saved).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: "Show meaning" }))
    fireEvent.click(await screen.findByRole("button", { name: "I know this" }))

    expect(await screen.findByRole("heading", { name: "hola" })).toBeInTheDocument()
    expect(saved).toEqual(["gracias:know"])
    fireEvent.click(screen.getByRole("button", { name: "Show meaning" }))
    fireEvent.click(await screen.findByRole("button", { name: "Still learning" }))

    expect(await screen.findByText("Every word from this session.")).toBeInTheDocument()
    expect(screen.getByText("hello")).toBeInTheDocument()
    expect(screen.getByText("thank you")).toBeInTheDocument()
    expect(saved).toEqual(["gracias:know", "hola:still_learning"])
  })
})
