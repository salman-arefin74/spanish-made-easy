import type { SupabaseClient } from "@supabase/supabase-js"

export type TopicSummary = {
  id: string
  title: string
  prerequisiteId: string | null
  sortOrder: number
}

export type TopicProgress = {
  topicId: string
  correctCount: number
  totalCount: number
  finished: boolean
}

export type LessonExample = {
  id: string
  spanish: string
  english: string
  sortOrder: number
}

export type LessonSlot = {
  name: string
  description: string
  wordIds: string[]
}

export type LessonPattern = {
  id: string
  title: string
  frame: string
  slots: LessonSlot[]
  sortOrder: number
}

export type LessonExercise = {
  id: string
  kind: "understand" | "construct" | "apply"
  prompt: string
  choices: string[] | null
  tokens: string[] | null
  acceptedAnswers: string[]
  translation: string | null
  explanation: string
  sortOrder: number
}

export type LessonTopic = TopicSummary & {
  explanation: string
  commonMistake: string
}

export type GrammarListResult =
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; topics: TopicSummary[]; progress: TopicProgress[] }

export type LessonResult =
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "missing" }
  | {
      status: "ready"
      topic: LessonTopic
      catalog: TopicSummary[]
      examples: LessonExample[]
      patterns: LessonPattern[]
      exercises: LessonExercise[]
      progress: TopicProgress[]
    }

function missingTable(message: string): boolean {
  return /schema cache|could not find the table|does not exist/i.test(message)
}

function failureMessage(message: string): string {
  const sentence = message.endsWith(".") ? message : `${message}.`
  if (/translation/i.test(message)) {
    return `${sentence} Run supabase/migrations/0004_exercise_translation.sql in the SQL editor, then npm run seed.`
  }
  const hint = missingTable(message)
    ? " Run supabase/migrations/0003_grammar.sql in the SQL editor, then npm run seed."
    : ""
  return `${sentence}${hint}`
}

function asProgress(rows: { topic_id: string; correct_count: number; total_count: number; finished: boolean }[]): TopicProgress[] {
  return rows.map((row) => ({
    topicId: row.topic_id,
    correctCount: row.correct_count,
    totalCount: row.total_count,
    finished: row.finished,
  }))
}

export async function loadGrammarList(supabase: SupabaseClient | null, userId: string): Promise<GrammarListResult> {
  if (!supabase) return { status: "unconfigured" }
  const [topics, progress] = await Promise.all([
    supabase.from("grammar_topics").select("id, title, prerequisite_id, sort_order").order("sort_order"),
    supabase.from("user_grammar_progress").select("topic_id, correct_count, total_count, finished").eq("user_id", userId),
  ])
  const failure = topics.error ?? progress.error
  if (failure) return { status: "error", message: failureMessage(failure.message) }
  const topicRows = topics.data ?? []
  if (topicRows.length === 0) return { status: "empty" }
  return {
    status: "ready",
    topics: topicRows.map((row) => ({
      id: row.id,
      title: row.title,
      prerequisiteId: row.prerequisite_id,
      sortOrder: row.sort_order,
    })),
    progress: asProgress(progress.data ?? []),
  }
}

export async function loadLesson(supabase: SupabaseClient | null, userId: string, topicId: string): Promise<LessonResult> {
  if (!supabase) return { status: "unconfigured" }
  const [topic, catalog, examples, patterns, exercises, progress] = await Promise.all([
    supabase.from("grammar_topics").select("id, title, explanation, common_mistake, prerequisite_id, sort_order").eq("id", topicId).maybeSingle(),
    supabase.from("grammar_topics").select("id, title, prerequisite_id, sort_order").order("sort_order"),
    supabase.from("grammar_examples").select("id, spanish, english, sort_order").eq("topic_id", topicId).order("sort_order"),
    supabase.from("sentence_patterns").select("id, title, frame, slots, sort_order").eq("topic_id", topicId).order("sort_order"),
    supabase.from("exercises").select("id, kind, prompt, choices, tokens, accepted_answers, translation, explanation, sort_order").eq("topic_id", topicId).order("sort_order"),
    supabase.from("user_grammar_progress").select("topic_id, correct_count, total_count, finished").eq("user_id", userId),
  ])
  const failure = topic.error ?? catalog.error ?? examples.error ?? patterns.error ?? exercises.error ?? progress.error
  if (failure) return { status: "error", message: failureMessage(failure.message) }
  if (!topic.data) return { status: "missing" }
  return {
    status: "ready",
    topic: {
      id: topic.data.id,
      title: topic.data.title,
      explanation: topic.data.explanation,
      commonMistake: topic.data.common_mistake,
      prerequisiteId: topic.data.prerequisite_id,
      sortOrder: topic.data.sort_order,
    },
    catalog: (catalog.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      prerequisiteId: row.prerequisite_id,
      sortOrder: row.sort_order,
    })),
    examples: (examples.data ?? []).map((row) => ({
      id: row.id,
      spanish: row.spanish,
      english: row.english,
      sortOrder: row.sort_order,
    })),
    patterns: (patterns.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      frame: row.frame,
      slots: Array.isArray(row.slots) ? (row.slots as LessonSlot[]) : [],
      sortOrder: row.sort_order,
    })),
    exercises: (exercises.data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      prompt: row.prompt,
      choices: row.choices,
      tokens: row.tokens,
      acceptedAnswers: row.accepted_answers,
      translation: row.translation,
      explanation: row.explanation,
      sortOrder: row.sort_order,
    })),
    progress: asProgress(progress.data ?? []),
  }
}
