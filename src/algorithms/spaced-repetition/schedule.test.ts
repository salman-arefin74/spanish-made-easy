import { describe, expect, it } from "vitest"
import { answerReview, isKnown, scheduleReview, shiftDate, type Memory } from "./schedule.ts"

const introduced: Memory = { intervalDays: 1, ease: 2.5, repetitions: 1 }

describe("spaced repetition", () => {
  it("sends Again back tomorrow and lowers ease, without going under 1.3", () => {
    expect(scheduleReview({ intervalDays: 10, ease: 2.5, repetitions: 4 }, "again")).toEqual({
      intervalDays: 1,
      ease: 2.3,
      repetitions: 0,
    })
    expect(scheduleReview({ intervalDays: 8, ease: 1.4, repetitions: 2 }, "again").ease).toBe(1.3)
  })

  it("brings Hard back sooner than Good, and Easy later than Good", () => {
    const hard = scheduleReview(introduced, "hard")
    const good = scheduleReview(introduced, "good")
    const easy = scheduleReview(introduced, "easy")
    expect(hard.intervalDays).toBeLessThan(good.intervalDays)
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays)
    expect(hard.ease).toBe(2.35)
    expect(good.ease).toBe(2.5)
    expect(easy.ease).toBe(2.65)
  })

  it("does not treat one successful review as known", () => {
    const once = scheduleReview(introduced, "good")
    expect(once.intervalDays).toBeLessThan(7)
    expect(isKnown(once.intervalDays, "good")).toBe(false)
    const twice = scheduleReview(once, "good")
    expect(twice.intervalDays).toBeGreaterThanOrEqual(7)
    expect(isKnown(twice.intervalDays, "good")).toBe(true)
    expect(isKnown(1, "know")).toBe(false)
  })

  it("does not repeat a reviewed word in the same session", () => {
    expect(answerReview(["cafe", "leche"])).toEqual(["leche"])
    expect(shiftDate("2026-11-16", 1)).toBe("2026-11-17")
    expect(shiftDate("2026-01-31", 1)).toBe("2026-02-01")
  })
})
