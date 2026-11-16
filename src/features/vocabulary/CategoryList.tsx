import { useEffect, useState } from "react"
import { Link } from "react-router"
import { EmptyState } from "../../components/ui/EmptyState.tsx"
import { PageHeading } from "../../components/ui/PageHeading.tsx"
import { useAuth } from "../auth/RequireAuth.tsx"
import { getSupabase } from "../../lib/supabase/client.ts"
import { loadBank, type BankResult, type StudyCategory, type StudyWord, type WordProgress } from "./bank.ts"
import { localDateISO, slotsRemaining } from "./session.ts"

const cardClass =
  "block rounded-2xl border border-line bg-card px-5 py-4 text-left transition-colors hover:bg-raised"

export function CategoryList({
  categories,
  words,
  progress,
  target,
  startingLevel,
  today,
}: {
  categories: StudyCategory[]
  words: StudyWord[]
  progress: WordProgress[]
  target: number
  startingLevel: "A1" | "A2"
  today: string
}) {
  const introduced = new Set(progress.map((row) => row.wordId))
  const introducedToday = progress.filter((row) => row.introducedOn === today).length
  const remaining = slotsRemaining(target, introducedToday)
  const recommendedId =
    startingLevel === "A2"
      ? (categories.find((category) => words.some((word) => word.categoryId === category.id && word.level === "A2" && !introduced.has(word.id)))
          ?.id ?? "everyday-essentials")
      : "everyday-essentials"

  return (
    <>
      <PageHeading
        title="Vocabulary"
        lede="New words for everyday Spanish from Spain. The daily target limits this session."
      />
      <Link className={`${cardClass} mt-8 border-copper`} to="/vocabulary/today">
        <span className="block text-lg font-semibold text-cream">Today's words</span>
        <span className="mt-1 block text-muted">
          {remaining === 0
            ? `All ${target} vocabulary slots for today are used.`
            : `${remaining} of ${target} new words left today.`}
        </span>
      </Link>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {categories.map((category) => {
          const total = words.filter((word) => word.categoryId === category.id).length
          const fresh = words.filter((word) => word.categoryId === category.id && !introduced.has(word.id)).length
          return (
            <li key={category.id}>
              <Link className={cardClass} to={`/vocabulary/${category.id}`}>
                <span className="block text-lg font-semibold text-cream">{category.label}</span>
                <span className="mt-1 block text-muted">{category.description}</span>
                <span className="mt-3 block text-sm text-cream">
                  {fresh} new of {total}
                  {category.id === recommendedId ? " · Start here" : ""}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function VocabularyPage() {
  const auth = useAuth()
  const [result, setResult] = useState<BankResult | { status: "loading" }>({ status: "loading" })
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    const userId = auth.userId
    if (!userId) return
    let active = true
    void loadBank(getSupabase(), userId).then((next) => {
      if (!active) return
      setToday(localDateISO(new Date()))
      setResult(next)
    })
    return () => {
      active = false
    }
  }, [auth.userId])

  if (result.status === "loading" || (result.status === "ready" && today === null)) {
    return <p className="text-lg text-muted">Loading the word bank…</p>
  }
  if (result.status === "unconfigured") {
    return (
      <>
        <PageHeading title="Vocabulary" lede="Words for everyday Spanish from Spain." />
        <EmptyState>
          The word bank is not connected. Add the Supabase keys, run the vocabulary SQL, and seed the words. This page does not show sample words.
        </EmptyState>
      </>
    )
  }
  if (result.status === "error") {
    return (
      <>
        <PageHeading title="Vocabulary" lede="Words for everyday Spanish from Spain." />
        <p className="mt-6 text-lg text-danger" role="alert">
          {result.message}
        </p>
      </>
    )
  }
  if (result.status === "empty") {
    return (
      <>
        <PageHeading title="Vocabulary" lede="Words for everyday Spanish from Spain." />
        <EmptyState>
          The word tables are empty. From spanish-made-easy, run npm run seed after the vocabulary SQL. This page does not show sample words.
        </EmptyState>
      </>
    )
  }

  if (!today) return <p className="text-lg text-muted">Loading the word bank…</p>

  const level = auth.profile?.proficiency_level === "A2" ? "A2" : "A1"
  const target = auth.profile?.daily_learning_target ?? 10
  return (
    <CategoryList
      categories={result.categories}
      words={result.words}
      progress={result.progress}
      target={target}
      startingLevel={level}
      today={today}
    />
  )
}
