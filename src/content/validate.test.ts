import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { readVocabularyDirectory } from "./files.ts"
import { validateVocabulary, type VocabularyCategory } from "./validate.ts"

const validCategory = (): VocabularyCategory => ({
  id: "everyday-essentials",
  label: "Everyday essentials",
  description: "Greetings and courtesy.",
  sortOrder: 1,
  recommendedLevel: "A1",
  words: [
    {
      id: "everyday-essentials-hola",
      spanish: "hola",
      english: "hello",
      partOfSpeech: "interjection",
      level: "A1",
      exampleSpanish: "Hola, me llamo Ana.",
      exampleEnglish: "Hello, my name is Ana.",
    },
  ],
})

describe("vocabulary content", () => {
  it("rejects a noun that has no article", () => {
    const category = validCategory()
    category.words[0] = {
      id: "everyday-essentials-cafe",
      spanish: "café",
      english: "coffee",
      partOfSpeech: "noun",
      level: "A1",
      exampleSpanish: "Quiero un café.",
      exampleEnglish: "I want a coffee.",
    }
    expect(validateVocabulary([category]).join("\n")).toMatch(/article/i)
  })

  it("accepts the seeded A1 bank", () => {
    const directory = join(dirname(fileURLToPath(import.meta.url)), "../../content/vocabulary")
    const categories = readVocabularyDirectory(directory)
    expect(validateVocabulary(categories)).toEqual([])
    expect(categories).toHaveLength(15)
    const words = categories.flatMap((category) => category.words)
    expect(words.filter((word) => word.level === "A1").length).toBeGreaterThanOrEqual(800)
    expect(new Set(words.map((word) => word.id)).size).toBe(words.length)
  })
})
