const PUNCTUATION = /[¿?¡!.,;:«»"'“”]/g

export function normalizeAnswer(value: string): string {
  return value.trim().toLocaleLowerCase("es").replace(PUNCTUATION, "").replace(/\s+/g, " ").trim()
}

export function answersMatch(given: string, accepted: readonly string[]): boolean {
  const normalized = normalizeAnswer(given)
  if (!normalized) return false
  return accepted.some((answer) => normalizeAnswer(answer) === normalized)
}

export function requiredCorrect(total: number): number {
  if (!Number.isInteger(total) || total < 1) {
    throw new Error("An exercise set needs a positive whole number of questions.")
  }
  return Math.ceil(total * 0.8)
}

export function topicFinished(correct: number, total: number): boolean {
  return correct >= requiredCorrect(total)
}
