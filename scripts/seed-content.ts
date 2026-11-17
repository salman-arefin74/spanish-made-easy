import { createClient } from "@supabase/supabase-js"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { readVocabularyDirectory } from "../src/content/files.ts"
import { readGrammarBundle, validateGrammar } from "../src/content/grammar.ts"
import { readScenarios, validateScenarios } from "../src/content/scenarios.ts"
import { validateVocabulary } from "../src/content/validate.ts"

const url = process.env.VITE_SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!url || !serviceKey) {
  console.error(
    "Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env. The secret key is only for this script. Never prefix it with VITE_.",
  )
  process.exit(1)
}

if (serviceKey === anonKey || serviceKey.startsWith("sb_publishable_")) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is a public key. Copy the secret key from Supabase, not the publishable or anon key.")
  process.exit(1)
}

const contentRoot = join(dirname(fileURLToPath(import.meta.url)), "../content")
const categories = readVocabularyDirectory(join(contentRoot, "vocabulary"))
const problems = validateVocabulary(categories)
if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(1)
}

const grammar = readGrammarBundle(contentRoot)
const wordIds = new Set(categories.flatMap((category) => category.words.map((word) => word.id)))
const grammarProblems = validateGrammar(grammar, wordIds)
if (grammarProblems.length > 0) {
  console.error(grammarProblems.join("\n"))
  process.exit(1)
}

const situations = readScenarios(contentRoot)
const wordText = new Map(
  categories.flatMap((category) => category.words.map((word) => [word.id, { spanish: word.spanish, english: word.english }] as const)),
)
const situationProblems = validateScenarios(situations, wordText)
if (situationProblems.length > 0) {
  console.error(situationProblems.join("\n"))
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const categoryRows = categories.map((category) => ({
  id: category.id,
  label: category.label,
  description: category.description,
  sort_order: category.sortOrder,
  recommended_level: category.recommendedLevel,
}))

const wordRows = categories.flatMap((category) =>
  category.words.map((word, index) => ({
    id: word.id,
    category_id: category.id,
    spanish: word.spanish,
    english: word.english,
    part_of_speech: word.partOfSpeech,
    level: word.level,
    example_spanish: word.exampleSpanish,
    example_english: word.exampleEnglish,
    article: word.article ?? null,
    plural: word.plural ?? null,
    spain_note: word.spainNote ?? null,
    sort_order: index,
  })),
)

const { error: categoryError } = await supabase.from("categories").upsert(categoryRows, { onConflict: "id" })
if (categoryError) {
  console.error(categoryError.message)
  process.exit(1)
}

for (let start = 0; start < wordRows.length; start += 200) {
  const batch = wordRows.slice(start, start + 200)
  const { error } = await supabase.from("words").upsert(batch, { onConflict: "id" })
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
}

const topics = [...grammar.topics].sort((left, right) => left.sortOrder - right.sortOrder)
for (const topic of topics) {
  const { error } = await supabase.from("grammar_topics").upsert(
    {
      id: topic.id,
      title: topic.title,
      explanation: topic.explanation,
      common_mistake: topic.commonMistake,
      prerequisite_id: topic.prerequisiteId,
      sort_order: topic.sortOrder,
    },
    { onConflict: "id" },
  )
  if (error) {
    console.error(seedFailure(error.message))
    process.exit(1)
  }
}

const exampleRows = grammar.topics.flatMap((topic) =>
  topic.examples.map((example) => ({
    id: `${topic.id}-example-${example.sortOrder}`,
    topic_id: topic.id,
    spanish: example.spanish,
    english: example.english,
    sort_order: example.sortOrder,
  })),
)
const patternRows = grammar.patterns.map((pattern) => ({
  id: pattern.id,
  topic_id: pattern.topicId,
  title: pattern.title,
  frame: pattern.frame,
  slots: pattern.slots,
  sort_order: pattern.sortOrder,
}))
const exerciseRows = grammar.exercises.map((exercise) => ({
  id: exercise.id,
  topic_id: exercise.topicId,
  kind: exercise.kind,
  prompt: exercise.prompt,
  choices: exercise.choices ?? null,
  tokens: exercise.tokens ?? null,
  accepted_answers: exercise.acceptedAnswers,
  translation: exercise.translation,
  explanation: exercise.explanation,
  sort_order: exercise.sortOrder,
}))

for (let start = 0; start < exampleRows.length; start += 200) {
  const { error } = await supabase.from("grammar_examples").upsert(exampleRows.slice(start, start + 200), { onConflict: "id" })
  if (error) {
    console.error(seedFailure(error.message))
    process.exit(1)
  }
}
for (let start = 0; start < patternRows.length; start += 200) {
  const { error } = await supabase.from("sentence_patterns").upsert(patternRows.slice(start, start + 200), { onConflict: "id" })
  if (error) {
    console.error(seedFailure(error.message))
    process.exit(1)
  }
}
for (let start = 0; start < exerciseRows.length; start += 200) {
  const { error } = await supabase.from("exercises").upsert(exerciseRows.slice(start, start + 200), { onConflict: "id" })
  if (error) {
    console.error(seedFailure(error.message))
    process.exit(1)
  }
}

const orderedSituations = [...situations].sort((left, right) => left.sortOrder - right.sortOrder)
for (const situation of orderedSituations) {
  const { error } = await supabase.from("situations").upsert(
    {
      id: situation.id,
      title: situation.title,
      aim: situation.aim,
      spain_note: situation.spainNote,
      sort_order: situation.sortOrder,
    },
    { onConflict: "id" },
  )
  if (error) {
    console.error(seedFailure(error.message))
    process.exit(1)
  }
}

const phraseRows = orderedSituations.flatMap((situation) =>
  situation.phrases.map((phrase) => ({
    id: `${situation.id}-phrase-${phrase.sortOrder}`,
    situation_id: situation.id,
    word_id: phrase.wordId,
    spanish: phrase.spanish,
    english: phrase.english,
    sort_order: phrase.sortOrder,
  })),
)
const turnRows = orderedSituations.flatMap((situation) =>
  situation.turns.map((turn) => ({
    id: `${situation.id}-turn-${turn.sortOrder}`,
    situation_id: situation.id,
    speaker: turn.speaker,
    spanish: turn.spanish,
    english: turn.english,
    sort_order: turn.sortOrder,
  })),
)
const situationExerciseRows = orderedSituations.flatMap((situation) =>
  situation.exercises.map((exercise) => ({
    id: exercise.id,
    situation_id: situation.id,
    kind: exercise.kind,
    prompt: exercise.prompt,
    choices: exercise.choices ?? null,
    tokens: exercise.tokens ?? null,
    accepted_answers: exercise.acceptedAnswers,
    translation: exercise.translation,
    explanation: exercise.explanation,
    sort_order: exercise.sortOrder,
  })),
)

for (let start = 0; start < phraseRows.length; start += 200) {
  const { error } = await supabase.from("situation_phrases").upsert(phraseRows.slice(start, start + 200), { onConflict: "id" })
  if (error) {
    console.error(seedFailure(error.message))
    process.exit(1)
  }
}
for (let start = 0; start < turnRows.length; start += 200) {
  const { error } = await supabase.from("situation_turns").upsert(turnRows.slice(start, start + 200), { onConflict: "id" })
  if (error) {
    console.error(seedFailure(error.message))
    process.exit(1)
  }
}
for (let start = 0; start < situationExerciseRows.length; start += 200) {
  const { error } = await supabase.from("situation_exercises").upsert(situationExerciseRows.slice(start, start + 200), { onConflict: "id" })
  if (error) {
    console.error(seedFailure(error.message))
    process.exit(1)
  }
}

const a1 = wordRows.filter((word) => word.level === "A1").length
console.log(
  `Seeded ${categories.length} categories and ${wordRows.length} words (${a1} A1), ${topics.length} grammar topics, ${patternRows.length} patterns, ${exerciseRows.length} exercises, and ${orderedSituations.length} situations. Safe to run again.`,
)

function seedFailure(message: string): string {
  const sentence = message.endsWith(".") ? message : `${message}.`
  if (/situation/i.test(message) && /schema cache|could not find the table|does not exist/i.test(message)) {
    return `${sentence} Run supabase/migrations/0006_scenarios.sql in the SQL editor, then npm run seed.`
  }
  if (/translation/i.test(message)) {
    return `${sentence} Run supabase/migrations/0004_exercise_translation.sql in the SQL editor, then npm run seed.`
  }
  if (/schema cache|could not find the table|does not exist/i.test(message)) {
    return `${sentence} Run supabase/migrations/0003_grammar.sql in the SQL editor, then npm run seed.`
  }
  return message
}
