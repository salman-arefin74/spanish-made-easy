import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ReviewCards, type ReviewItem } from "./ReviewSession.tsx"

const cafe: ReviewItem = {
  id: "cafe",
  categoryId: "food",
  spanish: "café",
  english: "coffee",
  partOfSpeech: "noun",
  level: "A1",
  exampleSpanish: "Quiero un café.",
  exampleEnglish: "I want a coffee.",
  article: "el",
  plural: "cafés",
  spainNote: null,
  sortOrder: 0,
  intervalDays: 1,
  ease: 2.5,
  repetitions: 1,
}

const leche: ReviewItem = { ...cafe, id: "leche", spanish: "leche", english: "milk", article: "la" }

describe("review session", () => {
  it("does not bring an Again card back in the same session", async () => {
    const grades: string[] = []
    render(
      <ReviewCards
        items={[cafe, leche]}
        onGrade={async (item, grade) => {
          grades.push(`${item.id}:${grade}`)
        }}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Show meaning" }))
    fireEvent.click(screen.getByRole("button", { name: "Again" }))
    expect(await screen.findByRole("heading", { level: 1, name: "la leche" })).toBeInTheDocument()
    expect(grades).toEqual(["cafe:again"])
  })
})
