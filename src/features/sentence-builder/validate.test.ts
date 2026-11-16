import { describe, expect, it } from "vitest"
import { grammarScoreRow } from "./score.ts"
import { answersMatch, normalizeAnswer, requiredCorrect, topicFinished } from "./validate.ts"

describe("sentence answers", () => {
  it("folds case and ignores surrounding punctuation", () => {
    expect(answersMatch("QUIERO un café.", ["Quiero un café"])).toBe(true)
    expect(answersMatch("¿Dónde está?", ["Dónde está"])).toBe(true)
    expect(normalizeAnswer("  ¿Dónde   está? ")).toBe("dónde está")
  })

  it("keeps accents meaningful", () => {
    expect(answersMatch("Quiero un cafe", ["Quiero un café"])).toBe(false)
    expect(answersMatch("Donde está", ["Dónde está"])).toBe(false)
  })

  it("accepts any listed answer and rejects a sentence that was not listed", () => {
    expect(answersMatch("Yo soy Ana", ["Soy Ana", "Yo soy Ana"])).toBe(true)
    expect(answersMatch("Soy de Madrid", ["Soy Ana", "Yo soy Ana"])).toBe(false)
    expect(answersMatch("   ", ["Soy Ana"])).toBe(false)
  })

  it("finishes a 12-question topic at 10 correct answers", () => {
    expect(requiredCorrect(12)).toBe(10)
    expect(topicFinished(9, 12)).toBe(false)
    expect(topicFinished(10, 12)).toBe(true)
    expect(grammarScoreRow("user-1", "noun-gender", 10, 12, "2026-11-16T00:00:00.000Z")).toMatchObject({
      finished: true,
      correct_count: 10,
      total_count: 12,
    })
    expect(grammarScoreRow("user-1", "noun-gender", 9, 12, "2026-11-16T00:00:00.000Z").finished).toBe(false)
  })
})
