import { join } from "node:path"
import { answersMatch, normalizeAnswer } from "../features/sentence-builder/validate.ts"
import { readJsonValues } from "./files.ts"

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const KINDS = ["understand", "construct", "apply"] as const

export type ExerciseKind = (typeof KINDS)[number]

export type GrammarExample = {
  spanish: string
  english: string
  sortOrder: number
}

export type GrammarTopic = {
  id: string
  title: string
  sortOrder: number
  prerequisiteId: string | null
  explanation: string
  commonMistake: string
  examples: GrammarExample[]
}

export type PatternSlot = {
  name: string
  description: string
  wordIds: string[]
}

export type SentencePattern = {
  id: string
  topicId: string
  title: string
  frame: string
  slots: PatternSlot[]
  sortOrder: number
}

export type GrammarExercise = {
  id: string
  topicId: string
  kind: ExerciseKind
  prompt: string
  choices?: string[]
  tokens?: string[]
  acceptedAnswers: string[]
  translation: string
  explanation: string
  sortOrder: number
}

export type GrammarBundle = {
  topics: GrammarTopic[]
  patterns: SentencePattern[]
  exercises: GrammarExercise[]
}

function problem(path: string, message: string): string {
  return `${path}: ${message}`
}

function trimmed(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value === value.trim()
}

export function builtFromTokens(answer: string, tokens: readonly string[]): boolean {
  const bag = new Map<string, number>()
  for (const token of tokens) {
    const key = normalizeAnswer(token)
    if (!key || key.includes(" ")) return false
    bag.set(key, (bag.get(key) ?? 0) + 1)
  }
  const words = normalizeAnswer(answer).split(" ").filter(Boolean)
  if (words.length === 0) return false
  for (const word of words) {
    const count = bag.get(word) ?? 0
    if (count === 0) return false
    bag.set(word, count - 1)
  }
  return true
}

export function readGrammarBundle(contentRoot: string): GrammarBundle {
  return {
    topics: readJsonValues(join(contentRoot, "grammar")) as GrammarTopic[],
    patterns: readJsonValues(join(contentRoot, "sentence-patterns")) as SentencePattern[],
    exercises: readJsonValues(join(contentRoot, "exercises")) as GrammarExercise[],
  }
}

export function validateGrammar(bundle: GrammarBundle, wordIds: ReadonlySet<string>): string[] {
  const problems: string[] = []
  const topics = Array.isArray(bundle.topics) ? bundle.topics : []
  const patterns = Array.isArray(bundle.patterns) ? bundle.patterns : []
  const exercises = Array.isArray(bundle.exercises) ? bundle.exercises : []
  if (!Array.isArray(bundle.topics)) problems.push("grammar: topics must be a list.")
  if (!Array.isArray(bundle.patterns)) problems.push("grammar: patterns must be a list.")
  if (!Array.isArray(bundle.exercises)) problems.push("grammar: exercises must be a list.")

  if (topics.length !== 20) problems.push(`grammar: expected 20 topics, found ${topics.length}.`)
  if (patterns.length < 40 || patterns.length > 60) {
    problems.push(`grammar: expected 40 to 60 sentence patterns, found ${patterns.length}.`)
  }

  const topicIds = new Set<string>()
  const sortOrders = new Set<number>()

  for (const topic of topics) {
    const where = topic?.id || "(missing topic id)"
    if (!trimmed(topic?.id) || !SLUG.test(topic.id)) problems.push(problem(where, "topic id must be a lowercase slug."))
    if (topicIds.has(topic?.id)) problems.push(problem(where, "duplicate topic id."))
    topicIds.add(topic?.id)
    if (!Number.isInteger(topic?.sortOrder) || topic.sortOrder < 1) {
      problems.push(problem(where, "sortOrder must be a whole number starting at 1."))
    } else if (sortOrders.has(topic.sortOrder)) {
      problems.push(problem(where, "duplicate sortOrder."))
    }
    sortOrders.add(topic?.sortOrder)
    if (!trimmed(topic?.title)) problems.push(problem(where, "title must be trimmed and non-empty."))
    if (!trimmed(topic?.explanation)) problems.push(problem(where, "explanation must be trimmed and non-empty."))
    if (!trimmed(topic?.commonMistake)) problems.push(problem(where, "commonMistake must be trimmed and non-empty."))
    if (!Array.isArray(topic?.examples) || topic.examples.length < 8) {
      problems.push(problem(where, "a topic needs at least 8 examples."))
    } else {
      const exampleOrders = new Set<number>()
      topic.examples.forEach((example, index) => {
        const exampleWhere = `${where}.examples[${index}]`
        if (!trimmed(example?.spanish)) problems.push(problem(exampleWhere, "spanish must be trimmed and non-empty."))
        if (!trimmed(example?.english)) problems.push(problem(exampleWhere, "english must be trimmed and non-empty."))
        if (!Number.isInteger(example?.sortOrder) || example.sortOrder < 0 || exampleOrders.has(example.sortOrder)) {
          problems.push(problem(exampleWhere, "sortOrder must be a unique whole number from 0."))
        }
        exampleOrders.add(example?.sortOrder)
      })
    }
  }

  for (const topic of topics) {
    if (!topic?.id || !topicIds.has(topic.id)) continue
    if (topic.prerequisiteId === null || topic.prerequisiteId === undefined) {
      if (topic.sortOrder !== 1) problems.push(problem(topic.id, "only the first topic can omit a prerequisite."))
      continue
    }
    if (typeof topic.prerequisiteId !== "string" || !topicIds.has(topic.prerequisiteId)) {
      problems.push(problem(topic.id, "prerequisiteId must name another topic."))
      continue
    }
    const earlier = topics.find((item) => item.id === topic.prerequisiteId)
    if (!earlier || earlier.sortOrder >= topic.sortOrder) {
      problems.push(problem(topic.id, "the prerequisite must be an earlier topic."))
    }
  }

  const patternIds = new Set<string>()
  const patternsByTopic = new Map<string, number>()
  for (const pattern of patterns) {
    const where = pattern?.id || "(missing pattern id)"
    if (!trimmed(pattern?.id) || !SLUG.test(pattern.id)) problems.push(problem(where, "pattern id must be a lowercase slug."))
    if (patternIds.has(pattern?.id)) problems.push(problem(where, "duplicate pattern id."))
    patternIds.add(pattern?.id)
    if (!trimmed(pattern?.topicId) || !topicIds.has(pattern.topicId)) {
      problems.push(problem(where, "topicId must name a topic."))
    } else if (!pattern.id.startsWith(`${pattern.topicId}-`)) {
      problems.push(problem(where, "pattern id must start with the topic id."))
    }
    patternsByTopic.set(pattern?.topicId, (patternsByTopic.get(pattern?.topicId) ?? 0) + 1)
    if (!trimmed(pattern?.title)) problems.push(problem(where, "title must be trimmed and non-empty."))
    if (!trimmed(pattern?.frame)) problems.push(problem(where, "frame must be trimmed and non-empty."))
    if (!Number.isInteger(pattern?.sortOrder) || pattern.sortOrder < 0) {
      problems.push(problem(where, "sortOrder must be a whole number from 0."))
    }
    if (!Array.isArray(pattern?.slots) || pattern.slots.length === 0) {
      problems.push(problem(where, "a pattern needs at least one slot."))
      continue
    }
    let linked = 0
    pattern.slots.forEach((slot, index) => {
      const slotWhere = `${where}.slots[${index}]`
      if (!trimmed(slot?.name)) problems.push(problem(slotWhere, "name must be trimmed and non-empty."))
      if (!trimmed(slot?.description)) problems.push(problem(slotWhere, "description must be trimmed and non-empty."))
      if (!Array.isArray(slot?.wordIds)) {
        problems.push(problem(slotWhere, "wordIds must be a list."))
        return
      }
      for (const wordId of slot.wordIds) {
        if (typeof wordId !== "string" || !wordIds.has(wordId)) {
          problems.push(problem(slotWhere, `unknown word id ${String(wordId)}.`))
        } else {
          linked += 1
        }
      }
    })
    if (linked === 0) problems.push(problem(where, "a pattern must name at least one word from the bank."))
  }

  for (const topic of topics) {
    if ((patternsByTopic.get(topic.id) ?? 0) < 2) {
      problems.push(problem(topic.id, "a topic needs at least 2 sentence patterns."))
    }
  }

  const exerciseIds = new Set<string>()
  const kindsByTopic = new Map<string, Set<string>>()
  const exerciseCount = new Map<string, number>()
  for (const exercise of exercises) {
    const where = exercise?.id || "(missing exercise id)"
    if (!trimmed(exercise?.id) || !SLUG.test(exercise.id)) problems.push(problem(where, "exercise id must be a lowercase slug."))
    if (exerciseIds.has(exercise?.id)) problems.push(problem(where, "duplicate exercise id."))
    exerciseIds.add(exercise?.id)
    if (!trimmed(exercise?.topicId) || !topicIds.has(exercise.topicId)) {
      problems.push(problem(where, "topicId must name a topic."))
    } else if (!exercise.id.startsWith(`${exercise.topicId}-`)) {
      problems.push(problem(where, "exercise id must start with the topic id."))
    }
    exerciseCount.set(exercise?.topicId, (exerciseCount.get(exercise?.topicId) ?? 0) + 1)
    if (!KINDS.includes(exercise?.kind)) problems.push(problem(where, "kind must be understand, construct, or apply."))
    else {
      const kinds = kindsByTopic.get(exercise.topicId) ?? new Set<string>()
      kinds.add(exercise.kind)
      kindsByTopic.set(exercise.topicId, kinds)
    }
    if (!trimmed(exercise?.prompt)) problems.push(problem(where, "prompt must be trimmed and non-empty."))
    if (!trimmed(exercise?.explanation)) problems.push(problem(where, "explanation must be trimmed and non-empty."))
    if (!trimmed(exercise?.translation)) problems.push(problem(where, "translation must be the English of the listed sentence."))
    if (!Number.isInteger(exercise?.sortOrder) || exercise.sortOrder < 0) {
      problems.push(problem(where, "sortOrder must be a whole number from 0."))
    }
    if (!Array.isArray(exercise?.acceptedAnswers) || exercise.acceptedAnswers.length === 0) {
      problems.push(problem(where, "acceptedAnswers needs at least one answer."))
      continue
    }
    if (exercise.acceptedAnswers.some((answer) => !trimmed(answer))) {
      problems.push(problem(where, "every accepted answer must be trimmed and non-empty."))
    }

    if (exercise?.kind === "understand") {
      if (exercise.tokens) problems.push(problem(where, "an understand exercise has no word tiles."))
      if (!Array.isArray(exercise.choices) || exercise.choices.length < 2) {
        problems.push(problem(where, "an understand exercise needs at least two choices."))
      } else {
        const seen = new Set<string>()
        for (const choice of exercise.choices) {
          if (!trimmed(choice)) problems.push(problem(where, "every choice must be trimmed and non-empty."))
          const key = typeof choice === "string" ? normalizeAnswer(choice) : ""
          if (seen.has(key)) problems.push(problem(where, "two choices match once punctuation and case are ignored."))
          seen.add(key)
        }
        for (const answer of exercise.acceptedAnswers) {
          if (typeof answer === "string" && !exercise.choices.some((choice) => answersMatch(choice, [answer]))) {
            problems.push(problem(where, "every accepted answer must be one of the choices."))
          }
        }
      }
    }

    if (exercise?.kind === "construct" || exercise?.kind === "apply") {
      if (exercise.choices) problems.push(problem(where, "a tile exercise has no multiple-choice list."))
      if (!Array.isArray(exercise.tokens) || exercise.tokens.length < 2) {
        problems.push(problem(where, "a tile exercise needs at least two tokens."))
      } else if (exercise.tokens.some((token) => !trimmed(token))) {
        problems.push(problem(where, "every token must be trimmed and non-empty."))
      } else {
        for (const answer of exercise.acceptedAnswers) {
          if (typeof answer === "string" && !builtFromTokens(answer, exercise.tokens)) {
            problems.push(problem(where, `the answer "${answer}" cannot be built from its tiles.`))
          }
        }
      }
    }
  }

  for (const topic of topics) {
    const count = exerciseCount.get(topic.id) ?? 0
    if (count < 12) problems.push(problem(topic.id, `a topic needs at least 12 exercises, found ${count}.`))
    const kinds = kindsByTopic.get(topic.id) ?? new Set<string>()
    for (const kind of KINDS) {
      if (!kinds.has(kind)) problems.push(problem(topic.id, `missing a ${kind} exercise.`))
    }
  }

  return problems
}
