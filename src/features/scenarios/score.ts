import { topicFinished } from "../sentence-builder/validate.ts"

export function situationScoreRow(
  userId: string,
  situationId: string,
  correct: number,
  total: number,
  updatedAt: string,
) {
  return {
    user_id: userId,
    situation_id: situationId,
    correct_count: correct,
    total_count: total,
    finished: topicFinished(correct, total),
    updated_at: updatedAt,
  }
}
