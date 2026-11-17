import { answersMatch } from "../sentence-builder/validate.ts"

export type ExamSet = "A1" | "A2" | "mixed"
export type QuestionKind = "es-en" | "en-es" | "choice" | "blank" | "article" | "verb"

export type ExamWord = {
  id: string
  spanish: string
  english: string
  partOfSpeech: string
  level: "A1" | "A2"
  exampleSpanish: string
  exampleEnglish: string
  article: string | null
}

export type ExamQuestion = {
  wordId: string
  kind: QuestionKind
  prompt: string
  detail: string | null
  choices: string[] | null
  accepted: string[]
  explanation: string
}

const CYCLE: QuestionKind[] = ["es-en", "en-es", "choice", "blank", "article", "verb"]

function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = next[index]
    next[index] = next[swap] as T
    next[swap] = current as T
  }
  return next
}

function spanishOf(word: ExamWord): string {
  return word.article ? `${word.article} ${word.spanish}` : word.spanish
}

export function gradeAnswer(given: string, accepted: readonly string[]): boolean {
  return answersMatch(given, accepted)
}

export function buildQuestion(word: ExamWord, kind: QuestionKind, pool: readonly ExamWord[]): ExamQuestion {
  const resolved = resolveKind(word, kind, pool)
  if (resolved === "article") {
    return {
      wordId: word.id,
      kind: "article",
      prompt: `Which article goes with ${word.spanish}?`,
      detail: null,
      choices: ["el", "la", "los", "las"],
      accepted: [word.article ?? ""],
      explanation: `${spanishOf(word)} means ${word.english}.`,
    }
  }
  if (resolved === "verb") {
    const verbs = pool.filter((item) => item.partOfSpeech === "verb" && item.id !== word.id)
    return {
      wordId: word.id,
      kind: "verb",
      prompt: `Which verb means "${word.english}"?`,
      detail: null,
      choices: [word.spanish, ...verbs.slice(0, 3).map((item) => item.spanish)],
      accepted: [word.spanish],
      explanation: `${word.exampleSpanish} ${word.exampleEnglish}`,
    }
  }
  if (resolved === "choice") {
    const others = pool.filter((item) => item.id !== word.id && item.english !== word.english)
    return {
      wordId: word.id,
      kind: "choice",
      prompt: `What does ${spanishOf(word)} mean?`,
      detail: null,
      choices: [word.english, ...others.slice(0, 3).map((item) => item.english)],
      accepted: [word.english],
      explanation: `${spanishOf(word)} means ${word.english}.`,
    }
  }
  if (resolved === "blank") {
    const pattern = new RegExp(word.spanish.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
    return {
      wordId: word.id,
      kind: "blank",
      prompt: "Fill the missing word.",
      detail: word.exampleSpanish.replace(pattern, "____"),
      choices: null,
      accepted: [word.spanish],
      explanation: `${word.exampleSpanish} ${word.exampleEnglish}`,
    }
  }
  if (resolved === "en-es") {
    return {
      wordId: word.id,
      kind: "en-es",
      prompt: `How do you say "${word.english}"?`,
      detail: null,
      choices: null,
      accepted: word.article ? [word.spanish, `${word.article} ${word.spanish}`] : [word.spanish],
      explanation: `${spanishOf(word)} means ${word.english}.`,
    }
  }
  return {
    wordId: word.id,
    kind: "es-en",
    prompt: `What does ${spanishOf(word)} mean?`,
    detail: null,
    choices: null,
    accepted: [word.english],
    explanation: `${spanishOf(word)} means ${word.english}.`,
  }
}

function resolveKind(word: ExamWord, kind: QuestionKind, pool: readonly ExamWord[]): QuestionKind {
  if (kind === "article" && word.partOfSpeech === "noun" && word.article) return "article"
  if (kind === "verb" && word.partOfSpeech === "verb") return "verb"
  if (kind === "blank" && word.exampleSpanish.toLocaleLowerCase("es").includes(word.spanish.toLocaleLowerCase("es"))) {
    return "blank"
  }
  if (kind === "choice" && pool.some((item) => item.id !== word.id && item.english !== word.english)) return "choice"
  if (kind === "en-es") return "en-es"
  return "es-en"
}

export function assembleExam(words: readonly ExamWord[], examSet: ExamSet, seed: number): ExamQuestion[] {
  const pool = examSet === "mixed" ? [...words] : words.filter((word) => word.level === examSet)
  if (pool.length < 15) return []
  const random = rng(seed)
  const chosen = shuffle(pool, random).slice(0, 15)
  return chosen.map((word, index) => buildQuestion(word, CYCLE[index % CYCLE.length] ?? "es-en", pool))
}
