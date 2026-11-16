import { describe, expect, it } from "vitest"
import {
  answerCard,
  localDateISO,
  nextLocalDateISO,
  orderForToday,
  selectNewWords,
  sessionPosition,
  slotsRemaining,
  startSession,
} from "./session.ts"

describe("vocabulary session", () => {
  it("uses the device's local calendar day", () => {
    expect(localDateISO(new Date(2026, 10, 16, 23, 30))).toBe("2026-11-16")
    expect(nextLocalDateISO(new Date(2026, 0, 31))).toBe("2026-02-01")
    expect(nextLocalDateISO(new Date(2026, 11, 31))).toBe("2027-01-01")
  })

  it("keeps new words inside the slots that are left today", () => {
    expect(slotsRemaining(10, 4)).toBe(6)
    expect(slotsRemaining(10, 10)).toBe(0)
    const words = [
      { id: "a", level: "A1" as const },
      { id: "b", level: "A2" as const },
      { id: "c", level: "A1" as const },
    ]
    expect(selectNewWords(words, new Set(["a"]), 2).map((word) => word.id)).toEqual(["b", "c"])
    expect(selectNewWords(words, new Set(), 0)).toEqual([])
  })

  it("offers A2 words first when that is the starting point, and keeps A1 available", () => {
    const words = [
      { id: "a1", level: "A1" as const },
      { id: "a2", level: "A2" as const },
    ]
    expect(orderForToday(words, "A1").map((word) => word.id)).toEqual(["a1", "a2"])
    expect(orderForToday(words, "A2").map((word) => word.id)).toEqual(["a2", "a1"])
  })

  it("shows a still-learning card once more, then stores that answer", () => {
    const started = startSession(["hola", "gracias"])
    const requeued = answerCard(started, "still_learning")
    expect(requeued.queue.map((card) => card.id)).toEqual(["gracias", "hola"])
    expect(requeued.finished).toEqual([])
    const afterSecond = answerCard(answerCard(requeued, "know"), "still_learning")
    expect(afterSecond.queue).toEqual([])
    expect(afterSecond.finished).toEqual([
      { id: "gracias", answer: "know" },
      { id: "hola", answer: "still_learning" },
    ])
  })

  it("counts I know this immediately and does not bring the card back", () => {
    const next = answerCard(startSession(["hola", "gracias"]), "know")
    expect(next.queue.map((card) => card.id)).toEqual(["gracias"])
    expect(next.finished).toEqual([{ id: "hola", answer: "know" }])
    expect(sessionPosition(next)).toBe("1 of 2")
  })
})
