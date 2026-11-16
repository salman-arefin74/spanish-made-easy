import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { VocabularyCategory } from "./validate.ts"

export function readVocabularyDirectory(directory: string): VocabularyCategory[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(directory, name), "utf8")) as VocabularyCategory)
}

export function readJsonValues(directory: string): unknown[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .flatMap((name) => {
      const parsed = JSON.parse(readFileSync(join(directory, name), "utf8")) as unknown
      return Array.isArray(parsed) ? parsed : [parsed]
    })
}
