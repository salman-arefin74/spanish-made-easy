import { PageHeading } from "../../components/ui/PageHeading.tsx"

export function PrivacyPage() {
  return (
    <>
      <PageHeading
        title="Privacy"
        lede="What this site stores about you."
      />
      <div className="mt-8 max-w-prose space-y-4 text-lg leading-relaxed text-cream">
        <p>We store your username and your study progress in Supabase.</p>
        <p>We do not store an email address.</p>
        <p>
          You cannot delete this data yourself. It remains for as long as the
          project exists. The person who runs the project can remove an account
          from the Supabase database.
        </p>
        <p>
          A forgotten password cannot be reset, and that username cannot be
          registered again.
        </p>
      </div>
    </>
  )
}
