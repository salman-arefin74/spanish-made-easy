import { topicFinished } from "./validate.ts"

export function grammarScoreRow(
  userId: string,
  topicId: string,
  correct: number,
  total: number,
  updatedAt: string,
) {
  return {
    user_id: userId,
    topic_id: topicId,
    correct_count: correct,
    total_count: total,
    finished: topicFinished(correct, total),
    updated_at: updatedAt,
  }
}
