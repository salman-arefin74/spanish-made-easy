import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { readVocabularyDirectory } from "./files.ts"
import { readScenarios, validateScenarios } from "./scenarios.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../content")

describe("situation content", () => {
  it("has 12 dialogues whose phrases come from the word bank", () => {
    const words = new Map(
      readVocabularyDirectory(join(root, "vocabulary")).flatMap((category) =>
        category.words.map((word) => [word.id, { spanish: word.spanish, english: word.english }] as const),
      ),
    )
    expect(validateScenarios(readScenarios(root), words)).toEqual([])
  })
})
