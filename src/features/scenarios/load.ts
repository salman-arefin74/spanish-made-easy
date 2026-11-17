import type { SupabaseClient } from "@supabase/supabase-js"
import type { SituationExercise } from "./SituationExercise.tsx"

export type SituationSummary = {
  id: string
  title: string
  aim: string
  sortOrder: number
}

export type SituationProgress = {
  situationId: string
  correctCount: number
  totalCount: number
  finished: boolean
}

export type SituationPhraseRow = {
  id: string
  spanish: string
  english: string
  sortOrder: number
}

export type SituationTurnRow = {
  id: string
  speaker: string
  spanish: string
  english: string
  sortOrder: number
}

export type SituationListResult =
  | { status: "unconfigured" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; situations: SituationSummary[]; progress: SituationProgress[] }

export type SituationResult =
  | { status: "unconfigured" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | {
      status: "ready"
      situation: SituationSummary & { spainNote: string | null }
      phrases: SituationPhraseRow[]
      turns: SituationTurnRow[]
      exercises: SituationExercise[]
      progress: SituationProgress | null
    }

function missingTable(message: string): string {
  if (!/schema cache|could not find the table|does not exist/i.test(message)) return message
  const sentence = message.endsWith(".") ? message : `${message}.`
  return `${sentence} Run supabase/migrations/0006_scenarios.sql in the SQL editor, then npm run seed.`
}

export async function loadSituationList(supabase: SupabaseClient | null, userId: string): Promise<SituationListResult> {
  if (!supabase) return { status: "unconfigured" }
  const [situations, progress] = await Promise.all([
    supabase.from("situations").select("id, title, aim, sort_order").order("sort_order"),
    supabase.from("user_situation_progress").select("situation_id, correct_count, total_count, finished").eq("user_id", userId),
  ])
  if (situations.error) return { status: "error", message: missingTable(situations.error.message) }
  if ((situations.data ?? []).length === 0) return { status: "empty" }
  return {
    status: "ready",
    situations: (situations.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      aim: row.aim,
      sortOrder: row.sort_order,
    })),
    progress: progress.error
      ? []
      : (progress.data ?? []).map((row) => ({
          situationId: row.situation_id,
          correctCount: row.correct_count,
          totalCount: row.total_count,
          finished: row.finished,
        })),
  }
}

export async function loadSituation(
  supabase: SupabaseClient | null,
  userId: string,
  situationId: string,
): Promise<SituationResult> {
  if (!supabase) return { status: "unconfigured" }
  const [situation, phrases, turns, exercises, progress] = await Promise.all([
    supabase.from("situations").select("id, title, aim, spain_note, sort_order").eq("id", situationId).maybeSingle(),
    supabase.from("situation_phrases").select("id, spanish, english, sort_order").eq("situation_id", situationId).order("sort_order"),
    supabase.from("situation_turns").select("id, speaker, spanish, english, sort_order").eq("situation_id", situationId).order("sort_order"),
    supabase
      .from("situation_exercises")
      .select("id, kind, prompt, choices, tokens, accepted_answers, translation, explanation, sort_order")
      .eq("situation_id", situationId)
      .order("sort_order"),
    supabase
      .from("user_situation_progress")
      .select("situation_id, correct_count, total_count, finished")
      .eq("user_id", userId)
      .eq("situation_id", situationId)
      .maybeSingle(),
  ])
  const failure = situation.error ?? phrases.error ?? turns.error ?? exercises.error
  if (failure) return { status: "error", message: missingTable(failure.message) }
  if (!situation.data) return { status: "missing" }
  return {
    status: "ready",
    situation: {
      id: situation.data.id,
      title: situation.data.title,
      aim: situation.data.aim,
      spainNote: situation.data.spain_note,
      sortOrder: situation.data.sort_order,
    },
    phrases: (phrases.data ?? []).map((row) => ({
      id: row.id,
      spanish: row.spanish,
      english: row.english,
      sortOrder: row.sort_order,
    })),
    turns: (turns.data ?? []).map((row) => ({
      id: row.id,
      speaker: row.speaker,
      spanish: row.spanish,
      english: row.english,
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
    })),
    progress: progress.error || !progress.data
      ? null
      : {
          situationId: progress.data.situation_id,
          correctCount: progress.data.correct_count,
          totalCount: progress.data.total_count,
          finished: progress.data.finished,
        },
  }
}
