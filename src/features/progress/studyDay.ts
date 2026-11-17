import type { SupabaseClient } from "@supabase/supabase-js"

export async function recordStudyDay(supabase: SupabaseClient, userId: string, today: string): Promise<void> {
  const { error } = await supabase.from("user_study_days").upsert(
    { user_id: userId, studied_on: today },
    { onConflict: "user_id,studied_on", ignoreDuplicates: true },
  )
  if (!error) return
  const sentence = error.message.endsWith(".") ? error.message : `${error.message}.`
  const hint = /schema cache|could not find the table|does not exist/i.test(error.message)
    ? " Run supabase/migrations/0005_revision_and_exams.sql in the SQL editor."
    : /permission denied/i.test(error.message)
      ? " Run the grant in supabase/migrations/0005_revision_and_exams.sql: grant select, insert on table public.user_study_days to authenticated;"
      : ""
  throw new Error(`${sentence}${hint}`)
}
