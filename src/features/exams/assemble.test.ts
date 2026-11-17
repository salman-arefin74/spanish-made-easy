import { describe, expect, it } from "vitest"
import { assembleExam, buildQuestion, gradeAnswer, type ExamWord } from "./assemble.ts"

function word(partial: Partial<ExamWord> & Pick<ExamWord, "id" | "spanish" | "english">): ExamWord {
  return {
    partOfSpeech: "noun",
    level: "A1",
    exampleSpanish: `Quiero ${partial.spanish}.`,
    exampleEnglish: `I want ${partial.english}.`,
    article: "el",
    ...partial,
  }
}

const cafe = word({ id: "cafe", spanish: "café", english: "coffee" })
const libro = word({ id: "libro", spanish: "libro", english: "book" })
const casa = word({ id: "casa", spanish: "casa", english: "house", article: "la", exampleSpanish: "La casa es grande." })
const comer = word({
  id: "comer",
  spanish: "comer",
  english: "to eat",
  partOfSpeech: "verb",
  article: null,
  exampleSpanish: "Quiero comer.",
})

describe("exam questions", () => {
  it("keeps accents and accepts a listed article with the noun", () => {
    expect(gradeAnswer("coffee", ["coffee"])).toBe(true)
    expect(gradeAnswer("cafe", ["café"])).toBe(false)
    expect(gradeAnswer("el café", ["café", "el café"])).toBe(true)
  })

  it("builds each question type from a bank word", () => {
    const pool = [cafe, libro, casa, comer]
    expect(buildQuestion(cafe, "article", pool).accepted).toEqual(["el"])
    expect(buildQuestion(comer, "verb", pool).choices).toContain("comer")
    expect(buildQuestion(casa, "blank", pool).detail).toBe("La ____ es grande.")
    expect(buildQuestion(cafe, "en-es", pool).accepted).toContain("café")
    expect(buildQuestion(cafe, "choice", pool).choices?.[0]).toBe("coffee")
  })

  it("draws 15 different words and refuses a set that is too small", () => {
    const bank = Array.from({ length: 20 }, (_, index) =>
      word({
        id: `word-${index}`,
        spanish: `palabra${index}`,
        english: `word ${index}`,
        level: index < 16 ? "A1" : "A2",
        exampleSpanish: `Es palabra${index}.`,
      }),
    )
    const exam = assembleExam(bank, "A1", 15)
    expect(exam).toHaveLength(15)
    expect(new Set(exam.map((question) => question.wordId)).size).toBe(15)
    expect(assembleExam(bank, "A1", 15).map((question) => question.wordId)).toEqual(
      assembleExam(bank, "A1", 15).map((question) => question.wordId),
    )
    expect(assembleExam(bank, "A2", 15)).toEqual([])
  })
})
