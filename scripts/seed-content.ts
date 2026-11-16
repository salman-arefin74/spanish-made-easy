import { createClient } from "@supabase/supabase-js"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { readVocabularyDirectory } from "../src/content/files.ts"
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

const directory = join(dirname(fileURLToPath(import.meta.url)), "../content/vocabulary")
const categories = readVocabularyDirectory(directory)
const problems = validateVocabulary(categories)
if (problems.length > 0) {
  console.error(problems.join("\n"))
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

const a1 = wordRows.filter((word) => word.level === "A1").length
console.log(`Seeded ${categories.length} categories and ${wordRows.length} words (${a1} A1). Safe to run again.`)
