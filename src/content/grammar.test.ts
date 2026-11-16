import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { readVocabularyDirectory } from "./files.ts"
import { readGrammarBundle, validateGrammar } from "./grammar.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../content")

describe("grammar content", () => {
  it("has 20 topics, 40 to 60 patterns, and exercises a learner can build", () => {
    const bundle = readGrammarBundle(root)
    const wordIds = new Set(
      readVocabularyDirectory(join(root, "vocabulary")).flatMap((category) => category.words.map((word) => word.id)),
    )
    expect(validateGrammar(bundle, wordIds)).toEqual([])
  })
})
