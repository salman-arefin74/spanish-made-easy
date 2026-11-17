import { describe, expect, it } from "vitest"
import { buildBoard, streakLength, type BoardProgress } from "./stats.ts"

const word = (id: string, level: "A1" | "A2" = "A1") => ({ id, level })

function row(partial: Partial<BoardProgress> & Pick<BoardProgress, "wordId">): BoardProgress {
  return {
    introducedOn: "2026-11-15",
    lastResponse: "know",
    lastReviewedOn: "2026-11-15",
    nextReviewOn: "2026-11-16",
    intervalDays: 1,
    ...partial,
  }
}

describe("progress figures", () => {
  it("hides the streak until two vocabulary days, and breaks it after a missed day", () => {
    expect(streakLength(["2026-11-16"], "2026-11-16")).toBe(1)
    expect(streakLength(["2026-11-15", "2026-11-16"], "2026-11-16")).toBe(2)
    expect(streakLength(["2026-11-14", "2026-11-15"], "2026-11-16")).toBe(2)
    expect(streakLength(["2026-11-13", "2026-11-14"], "2026-11-16")).toBe(0)
  })

  it("shows zeroes and the first step before any study", () => {
    const board = buildBoard({
      words: [word("cafe"), word("libro")],
      progress: [],
      studyDays: [],
      topics: [{ id: "noun-gender", title: "Noun gender", sortOrder: 1, finished: false }],
      exams: [],
      today: "2026-11-16",
      dailyTarget: 10,
    })
    expect(board.a1Known).toBe(0)
    expect(board.a1Total).toBe(2)
    expect(board.introduced).toBe(0)
    expect(board.retention).toBeNull()
    expect(board.streak).toBeNull()
    expect(board.slotsLeft).toBe(10)
    expect(board.action.label).toBe("Learn your first words")
    expect(board.exams).toEqual([])
    expect(board.situationsFinished).toBe(0)
  })

  it("counts a word as known only after a successful review of at least 7 days", () => {
    const board = buildBoard({
      words: [word("cafe"), word("tren", "A2")],
      progress: [
        row({ wordId: "cafe", lastResponse: "good", intervalDays: 8, nextReviewOn: "2026-11-20" }),
        row({ wordId: "tren", lastResponse: "know", intervalDays: 1 }),
      ],
      studyDays: ["2026-11-15", "2026-11-16"],
      topics: [
        { id: "noun-gender", title: "Noun gender", sortOrder: 1, finished: true },
        { id: "articles", title: "Articles", sortOrder: 2, finished: false },
      ],
      exams: [{ id: "attempt-1", examSet: "A1", correct: 12, total: 15, createdAt: "2026-11-16T10:00:00.000Z" }],
      today: "2026-11-16",
      dailyTarget: 10,
    })
    expect(board.a1Known).toBe(1)
    expect(board.a2Known).toBe(0)
    expect(board.retention).toEqual({ known: 1, introduced: 2 })
    expect(board.streak).toBe(2)
    expect(board.due).toBe(1)
    expect(board.action.href).toBe("/revision")
    expect(board.grammarFinished).toBe(1)
    expect(board.nextTopic?.title).toBe("Articles")
    expect(board.nextReview).toBe("Due now")
  })
})
