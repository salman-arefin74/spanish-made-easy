import { join } from "node:path"
import { builtFromTokens } from "./grammar.ts"
import { readJsonValues } from "./files.ts"
import { normalizeAnswer } from "../features/sentence-builder/validate.ts"

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SPAIN_FORMS = ["ordenador", "móvil", "coger", "vosotros"] as const

export type SituationKind = "comprehension" | "construct"

export type SituationPhrase = {
  wordId: string
  spanish: string
  english: string
  sortOrder: number
}

export type SituationTurn = {
  speaker: string
  spanish: string
  english: string
  sortOrder: number
}

export type SituationExercise = {
  id: string
  situationId: string
  kind: SituationKind
  prompt: string
  choices?: string[]
  tokens?: string[]
  acceptedAnswers: string[]
  translation: string
  explanation: string
  sortOrder: number
}

export type Situation = {
  id: string
  title: string
  aim: string
  spainNote: string | null
  sortOrder: number
  phrases: SituationPhrase[]
  turns: SituationTurn[]
  exercises: SituationExercise[]
}

function problem(path: string, message: string): string {
  return `${path}: ${message}`
}

function trimmed(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value === value.trim()
}

function textOf(situation: Situation): string {
  return [...situation.phrases.map((phrase) => phrase.spanish), ...situation.turns.map((turn) => turn.spanish)]
    .join("\n")
    .toLocaleLowerCase("es")
}

export function readScenarios(contentRoot: string): Situation[] {
  return readJsonValues(join(contentRoot, "scenarios")).map((value, index) => {
    const record = value as Partial<Situation> & { phrases?: unknown[]; turns?: unknown[]; exercises?: unknown[] }
    const id = typeof record.id === "string" ? record.id : `scenario-${index}`
    return {
      id,
      title: record.title ?? "",
      aim: record.aim ?? "",
      spainNote: record.spainNote ?? null,
      sortOrder: record.sortOrder ?? 0,
      phrases: (record.phrases ?? []).map((phrase, phraseIndex) => {
        const row = phrase as Partial<SituationPhrase>
        return {
          wordId: row.wordId ?? "",
          spanish: row.spanish ?? "",
          english: row.english ?? "",
          sortOrder: phraseIndex,
        }
      }),
      turns: (record.turns ?? []).map((turn, turnIndex) => {
        const row = turn as Partial<SituationTurn>
        return {
          speaker: row.speaker ?? "",
          spanish: row.spanish ?? "",
          english: row.english ?? "",
          sortOrder: turnIndex,
        }
      }),
      exercises: (record.exercises ?? []).map((exercise, exerciseIndex) => {
        const row = exercise as Partial<SituationExercise>
        return {
          id: row.id ?? "",
          situationId: id,
          kind: row.kind ?? "comprehension",
          prompt: row.prompt ?? "",
          choices: row.choices,
          tokens: row.tokens,
          acceptedAnswers: row.acceptedAnswers ?? [],
          translation: row.translation ?? "",
          explanation: row.explanation ?? "",
          sortOrder: exerciseIndex,
        }
      }),
    }
  })
}

export function validateScenarios(
  situations: readonly Situation[],
  words: ReadonlyMap<string, { spanish: string; english: string }>,
): string[] {
  const problems: string[] = []
  if (situations.length !== 12) problems.push(`Expected 12 situations, found ${situations.length}.`)
  const ids = new Set<string>()
  const orders = new Set<number>()
  const exerciseIds = new Set<string>()
  for (const situation of situations) {
    const path = situation.id || "(missing id)"
    if (!SLUG.test(situation.id)) problems.push(problem(path, "The id must be a lowercase slug."))
    if (ids.has(situation.id)) problems.push(problem(path, "Duplicate situation id."))
    ids.add(situation.id)
    if (!Number.isInteger(situation.sortOrder) || situation.sortOrder < 1) {
      problems.push(problem(path, "sortOrder must be a positive whole number."))
    } else if (orders.has(situation.sortOrder)) problems.push(problem(path, "Duplicate sortOrder."))
    orders.add(situation.sortOrder)
    if (!trimmed(situation.title)) problems.push(problem(path, "The title must be trimmed text."))
    if (!trimmed(situation.aim)) problems.push(problem(path, "The aim must be trimmed text."))
    if (situation.spainNote !== null && !trimmed(situation.spainNote)) {
      problems.push(problem(path, "The Spain note must be trimmed text or null."))
    }
    if (situation.phrases.length < 4) problems.push(problem(path, "A situation needs at least 4 phrases from the bank."))
    if (situation.turns.length < 6) problems.push(problem(path, "A situation needs at least 6 dialogue turns."))
    const spoken = textOf(situation)
    for (const form of SPAIN_FORMS) {
      if (spoken.includes(form.toLocaleLowerCase("es")) && !situation.spainNote) {
        problems.push(problem(path, `A Spain note is required because the dialogue uses ${form}.`))
      }
    }
    for (const phrase of situation.phrases) {
      const word = words.get(phrase.wordId)
      if (!word) problems.push(problem(path, `Unknown phrase word ${phrase.wordId}.`))
      else if (normalizeAnswer(phrase.spanish) !== normalizeAnswer(word.spanish)) {
        problems.push(problem(path, `${phrase.wordId} does not match the bank headword.`))
      } else if (phrase.english !== word.english) {
        problems.push(problem(path, `${phrase.wordId} does not match the bank English.`))
      }
    }
    for (const turn of situation.turns) {
      if (!trimmed(turn.speaker) || !trimmed(turn.spanish) || !trimmed(turn.english)) {
        problems.push(problem(path, "Every turn needs a speaker, Spanish, and English."))
      }
    }
    const kinds = { comprehension: 0, construct: 0 }
    for (const exercise of situation.exercises) {
      const where = exercise.id || path
      if (!SLUG.test(exercise.id)) problems.push(problem(where, "The exercise id must be a lowercase slug."))
      if (exerciseIds.has(exercise.id)) problems.push(problem(where, "Duplicate exercise id."))
      exerciseIds.add(exercise.id)
      if (exercise.situationId !== situation.id) problems.push(problem(where, "The exercise is on the wrong situation."))
      if (!trimmed(exercise.prompt) || !trimmed(exercise.translation) || !trimmed(exercise.explanation)) {
        problems.push(problem(where, "Prompt, translation, and explanation must be trimmed text."))
      }
      if (exercise.acceptedAnswers.length === 0) problems.push(problem(where, "An exercise needs an accepted answer."))
      if (exercise.kind === "comprehension") {
        kinds.comprehension += 1
        const choices = exercise.choices ?? []
        const seen = new Set<string>()
        for (const choice of choices) {
          const key = normalizeAnswer(choice)
          if (!key || seen.has(key)) problems.push(problem(where, "Choices must be unique."))
          seen.add(key)
        }
        if (choices.length < 2) problems.push(problem(where, "A comprehension question needs at least two choices."))
        const accepted = normalizeAnswer(exercise.acceptedAnswers[0] ?? "")
        if (!choices.some((choice) => normalizeAnswer(choice) === accepted)) {
          problems.push(problem(where, "The accepted answer must be one of the choices."))
        }
        const spoken = situation.turns.map((turn) => normalizeAnswer(turn.spanish))
        if (accepted.split(" ").length < 2 || !spoken.some((line) => line.includes(accepted))) {
          problems.push(problem(where, "The comprehension answer must be a Spanish line from the dialogue."))
        }
      } else if (exercise.kind === "construct") {
        kinds.construct += 1
        const tokens = exercise.tokens ?? []
        if (tokens.length < 2) problems.push(problem(where, "A construction exercise needs tokens."))
        for (const answer of exercise.acceptedAnswers) {
          if (!builtFromTokens(answer, tokens)) problems.push(problem(where, "The answer cannot be built from the tokens."))
        }
      } else {
        problems.push(problem(where, "Kind must be comprehension or construct."))
      }
    }
    if (kinds.comprehension < 3) problems.push(problem(path, "A situation needs at least 3 comprehension exercises."))
    if (kinds.construct < 3) problems.push(problem(path, "A situation needs at least 3 construction exercises."))
  }
  const corpus = situations.map((situation) => textOf(situation)).join("\n")
  for (const form of SPAIN_FORMS) {
    if (!corpus.includes(form.toLocaleLowerCase("es"))) {
      problems.push(`One situation must use the Spain form ${form}.`)
    }
  }
  return problems
}
