import { createClient } from "@supabase/supabase-js"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { readVocabularyDirectory } from "../src/content/files.ts"
import { readGrammarBundle, validateGrammar } from "../src/content/grammar.ts"
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

const a1 = wordRows.filter((word) => word.level === "A1").length
console.log(
  `Seeded ${categories.length} categories and ${wordRows.length} words (${a1} A1), ${topics.length} grammar topics, ${patternRows.length} patterns, and ${exerciseRows.length} exercises. Safe to run again.`,
)

function seedFailure(message: string): string {
  if (/translation/i.test(message)) {
    const sentence = message.endsWith(".") ? message : `${message}.`
    return `${sentence} Run supabase/migrations/0004_exercise_translation.sql in the SQL editor, then npm run seed.`
  }
  if (/schema cache|could not find the table|does not exist/i.test(message)) {
    const sentence = message.endsWith(".") ? message : `${message}.`
    return `${sentence} Run supabase/migrations/0003_grammar.sql in the SQL editor, then npm run seed.`
  }
  return message
}
