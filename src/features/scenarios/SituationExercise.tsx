import { useState } from "react"
import { ConstructExercise } from "../sentence-builder/ConstructExercise.tsx"
import { answersMatch, normalizeAnswer } from "../sentence-builder/validate.ts"

const checkClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-5 py-3 font-semibold text-copper-ink disabled:opacity-50"

export type SituationExercise = {
  id: string
  kind: "comprehension" | "construct"
  prompt: string
  choices: string[] | null
  tokens: string[] | null
  acceptedAnswers: string[]
  translation: string
  explanation: string
}

export function SituationExerciseCard({
  exercise,
  position,
  onAdvance,
}: {
  exercise: SituationExercise
  position: string
  onAdvance: (correct: boolean) => void
}) {
  const [choice, setChoice] = useState("")
  const [sentence, setSentence] = useState("")
  const [result, setResult] = useState<boolean | null>(null)
  const given = exercise.kind === "comprehension" ? choice : sentence
  const spain = exercise.acceptedAnswers[0] ?? ""
  const variant = result === true && normalizeAnswer(given) !== normalizeAnswer(spain)

  function check() {
    if (result !== null || !given.trim()) return
    setResult(answersMatch(given, exercise.acceptedAnswers))
  }

  return (
    <section className="mt-8" aria-labelledby="situation-prompt">
      <p className="text-sm font-semibold text-copper">
        {exercise.kind === "comprehension" ? "Comprehension" : "Construct"} · {position}
      </p>
      <h2 id="situation-prompt" className="mt-2 text-2xl font-semibold text-cream">
        {exercise.prompt}
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (result !== null) {
            onAdvance(result)
            return
          }
          check()
        }}
      >
        {exercise.kind === "comprehension" ? (
          <div className="mt-6 grid gap-3">
            {(exercise.choices ?? []).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={choice === option}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-lg ${
                  choice === option ? "border-copper bg-raised text-cream" : "border-line bg-card text-cream"
                }`}
                disabled={result !== null}
                onClick={() => setChoice(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <ConstructExercise tokens={exercise.tokens ?? []} onChange={setSentence} />
          </div>
        )}
        {result === null ? (
          <button type="submit" className={`${checkClass} mt-6`} disabled={!given.trim()}>
            Check
          </button>
        ) : (
          <div className="card-reveal mt-6 max-w-prose rounded-2xl border border-line bg-card px-5 py-4">
            <p className={result ? "text-lg font-semibold text-cream" : "text-lg font-semibold text-danger"}>
              {result ? "That's one of the listed answers." : "That is not one of the listed answers."}
            </p>
            {variant ? <p className="mt-2 text-cream">In Spain: {spain}</p> : null}
            {result === false ? <p className="mt-2 text-lg text-cream">{spain}</p> : null}
            <p className="mt-2 text-lg text-cream">{exercise.translation}</p>
            <p className="mt-2 text-muted">{exercise.explanation}</p>
            <button type="button" className={`${checkClass} mt-4`} onClick={() => onAdvance(result)}>
              Continue
            </button>
          </div>
        )}
      </form>
    </section>
  )
}
