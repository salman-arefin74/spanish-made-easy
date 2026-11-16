import { ONBOARDING_LEVELS, PRESET_TARGETS, type OnboardingLevel } from "./username.ts"

const choiceClass = (selected: boolean) =>
  [
    "rounded-xl border px-4 py-3 text-left transition-colors",
    selected
      ? "border-copper bg-copper text-copper-ink"
      : "border-line bg-ink text-cream hover:bg-raised",
  ].join(" ")

type StudyPreferencesProps = {
  level: OnboardingLevel | null
  targetText: string
  onLevel: (level: OnboardingLevel) => void
  onTargetText: (value: string) => void
}

export function StudyPreferences({
  level,
  targetText,
  onLevel,
  onTargetText,
}: StudyPreferencesProps) {
  return (
    <fieldset className="mt-8 max-w-xl space-y-6">
      <legend className="text-lg text-cream">Where should we start?</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {ONBOARDING_LEVELS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={level === item}
            className={choiceClass(level === item)}
            onClick={() => onLevel(item)}
          >
            <span className="block font-semibold">
              {item === "A1" ? "Starting from zero" : "I already know some basics"}
            </span>
            <span className="mt-1 block text-sm">
              {item === "A1"
                ? "Recommend A1. Every lesson stays available."
                : "Recommend A2. A1 stays available too."}
            </span>
          </button>
        ))}
      </div>
      <div>
        <p className="text-lg text-cream">Daily words</p>
        <p className="mt-1 text-muted">
          This number is the vocabulary session. Reviews fill it first.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_TARGETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={targetText === String(preset)}
              className={choiceClass(targetText === String(preset))}
              onClick={() => onTargetText(String(preset))}
            >
              {preset}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-cream" htmlFor="daily-target">
          Custom target
          <input
            id="daily-target"
            inputMode="numeric"
            className="mt-2 w-full max-w-xs rounded-xl border border-line bg-ink px-4 py-3 text-lg text-cream"
            value={PRESET_TARGETS.some((preset) => String(preset) === targetText) ? "" : targetText}
            placeholder="5 to 50"
            onChange={(event) => onTargetText(event.target.value)}
          />
        </label>
      </div>
    </fieldset>
  )
}
