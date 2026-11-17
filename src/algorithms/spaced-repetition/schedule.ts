export type ReviewGrade = "again" | "hard" | "good" | "easy"

export type Memory = {
  intervalDays: number
  ease: number
  repetitions: number
}

const EASE_FLOOR = 1.3
const SUCCESS: readonly ReviewGrade[] = ["hard", "good", "easy"]

function easeOf(value: number): number {
  const floored = Math.max(EASE_FLOOR, value)
  return Math.round(floored * 100) / 100
}

function daysOf(value: number): number {
  return Math.max(1, Math.ceil(value))
}

export function scheduleReview(memory: Memory, grade: ReviewGrade): Memory {
  if (grade === "again") {
    return {
      intervalDays: 1,
      ease: easeOf(memory.ease - 0.2),
      repetitions: 0,
    }
  }
  if (grade === "hard") {
    return {
      intervalDays: daysOf(memory.intervalDays * 1.2),
      ease: easeOf(memory.ease - 0.15),
      repetitions: memory.repetitions + 1,
    }
  }
  const goodDays = memory.intervalDays * memory.ease
  if (grade === "good") {
    return {
      intervalDays: daysOf(goodDays),
      ease: easeOf(memory.ease),
      repetitions: memory.repetitions + 1,
    }
  }
  return {
    intervalDays: daysOf(goodDays * 1.3),
    ease: easeOf(memory.ease + 0.15),
    repetitions: memory.repetitions + 1,
  }
}

export function isKnown(intervalDays: number, response: string): boolean {
  return intervalDays >= 7 && SUCCESS.includes(response as ReviewGrade)
}

export function shiftDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
  date.setDate(date.getDate() + days)
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0")
  const nextDay = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`
}

export function answerReview(queue: readonly string[]): string[] {
  return queue.slice(1)
}
