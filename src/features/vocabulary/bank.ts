import type { SupabaseClient } from "@supabase/supabase-js"
import type { ContentLevel } from "../../content/validate.ts"

export type StudyWord = {
  id: string
  categoryId: string
  spanish: string
  english: string
  partOfSpeech: string
  level: ContentLevel
  exampleSpanish: string
  exampleEnglish: string
  article: string | null
  plural: string | null
  spainNote: string | null
  sortOrder: number
}

export type StudyCategory = {
  id: string
  label: string
  description: string
  sortOrder: number
  recommendedLevel: ContentLevel
}

export type WordProgress = {
  wordId: string
  introducedOn: string
}

export type BankReady = {
  status: "ready"
  categories: StudyCategory[]
  words: StudyWord[]
  progress: WordProgress[]
}

export type BankResult =
  | { status: "unconfigured" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | BankReady

type CategoryRow = {
  id: string
  label: string
  description: string
  sort_order: number
  recommended_level: ContentLevel
}

type WordRow = {
  id: string
  category_id: string
  spanish: string
  english: string
  part_of_speech: string
  level: ContentLevel
  example_spanish: string
  example_english: string
  article: string | null
  plural: string | null
  spain_note: string | null
  sort_order: number
}

type ProgressRow = {
  word_id: string
  introduced_on: string
}

function missingTable(message: string): boolean {
  return /schema cache|could not find the table|does not exist/i.test(message)
}

export async function loadBank(supabase: SupabaseClient | null, userId: string): Promise<BankResult> {
  if (!supabase) return { status: "unconfigured" }

  const [categories, words, progress] = await Promise.all([
    supabase.from("categories").select("id, label, description, sort_order, recommended_level").order("sort_order"),
    supabase
      .from("words")
      .select(
        "id, category_id, spanish, english, part_of_speech, level, example_spanish, example_english, article, plural, spain_note, sort_order",
      )
      .order("sort_order"),
    supabase.from("user_word_progress").select("word_id, introduced_on").eq("user_id", userId),
  ])

  const failure = categories.error ?? words.error ?? progress.error
  if (failure) {
    const sentence = failure.message.endsWith(".") ? failure.message : `${failure.message}.`
    const hint = missingTable(failure.message)
      ? " Run supabase/migrations/0002_vocabulary.sql in the SQL editor, then npm run seed."
      : ""
    return { status: "error", message: `${sentence}${hint}` }
  }

  const categoryRows = (categories.data ?? []) as CategoryRow[]
  if (categoryRows.length === 0) return { status: "empty" }

  return {
    status: "ready",
    categories: categoryRows.map((row) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      sortOrder: row.sort_order,
      recommendedLevel: row.recommended_level,
    })),
    words: ((words.data ?? []) as WordRow[]).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      spanish: row.spanish,
      english: row.english,
      partOfSpeech: row.part_of_speech,
      level: row.level,
      exampleSpanish: row.example_spanish,
      exampleEnglish: row.example_english,
      article: row.article,
      plural: row.plural,
      spainNote: row.spain_note,
      sortOrder: row.sort_order,
    })),
    progress: ((progress.data ?? []) as ProgressRow[]).map((row) => ({
      wordId: row.word_id,
      introducedOn: row.introduced_on,
    })),
  }
}
