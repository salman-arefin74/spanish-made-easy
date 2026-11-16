export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "phrase",
  "pronoun",
  "preposition",
  "number",
  "interjection",
] as const

export const ARTICLES = ["el", "la", "los", "las"] as const
export const CONTENT_LEVELS = ["A1", "A2"] as const

export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number]
export type Article = (typeof ARTICLES)[number]
export type ContentLevel = (typeof CONTENT_LEVELS)[number]

export type VocabularyWord = {
  id: string
  spanish: string
  english: string
  partOfSpeech: PartOfSpeech
  level: ContentLevel
  exampleSpanish: string
  exampleEnglish: string
  article?: Article
  plural?: string
  spainNote?: string
}

export type VocabularyCategory = {
  id: string
  label: string
  description: string
  sortOrder: number
  recommendedLevel: ContentLevel
  words: VocabularyWord[]
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function problem(path: string, message: string): string {
  return `${path}: ${message}`
}

export function validateVocabulary(categories: VocabularyCategory[]): string[] {
  const problems: string[] = []
  const categoryIds = new Set<string>()
  const sortOrders = new Set<number>()
  const wordIds = new Set<string>()

  for (const category of categories) {
    const where = category.id || "(missing category id)"
    if (!SLUG.test(category.id)) problems.push(problem(where, "category id must be a lowercase slug."))
    if (categoryIds.has(category.id)) problems.push(problem(where, "duplicate category id."))
    categoryIds.add(category.id)
    if (!Number.isInteger(category.sortOrder) || category.sortOrder < 1) {
      problems.push(problem(where, "sortOrder must be a whole number starting at 1."))
    }
    if (sortOrders.has(category.sortOrder)) problems.push(problem(where, "duplicate sortOrder."))
    sortOrders.add(category.sortOrder)
    if (!category.label.trim()) problems.push(problem(where, "label is empty."))
    if (!category.description.trim()) problems.push(problem(where, "description is empty."))
    if (!CONTENT_LEVELS.includes(category.recommendedLevel)) {
      problems.push(problem(where, "recommendedLevel must be A1 or A2."))
    }
    if (category.words.length === 0) problems.push(problem(where, "category has no words."))

    const seenSpanish = new Set<string>()
    category.words.forEach((word, index) => {
      const wordWhere = `${where}.words[${index}]`
      const prefix = `${category.id}-`
      if (!SLUG.test(word.id) || !word.id.startsWith(prefix) || word.id.length === prefix.length) {
        problems.push(problem(wordWhere, `id must start with ${prefix} and use a lowercase slug.`))
      }
      if (wordIds.has(word.id)) problems.push(problem(wordWhere, "duplicate word id."))
      wordIds.add(word.id)
      if (!CONTENT_LEVELS.includes(word.level)) problems.push(problem(wordWhere, "level must be A1 or A2."))
      if (!PARTS_OF_SPEECH.includes(word.partOfSpeech)) {
        problems.push(problem(wordWhere, "partOfSpeech is not a known value."))
      }
      for (const field of ["spanish", "english", "exampleSpanish", "exampleEnglish"] as const) {
        const value = word[field]
        if (typeof value !== "string" || value.trim() === "" || value !== value.trim()) {
          problems.push(problem(wordWhere, `${field} must be trimmed and non-empty.`))
        }
      }
      const fingerprint = `${word.partOfSpeech}:${word.spanish.toLowerCase()}`
      if (seenSpanish.has(fingerprint)) {
        problems.push(problem(wordWhere, "duplicate Spanish entry in this category."))
      }
      seenSpanish.add(fingerprint)
      if (word.partOfSpeech === "noun") {
        if (!word.article || !ARTICLES.includes(word.article)) {
          problems.push(problem(wordWhere, "a noun needs an article: el, la, los, or las."))
        }
      } else if (word.article) {
        problems.push(problem(wordWhere, "only nouns have an article."))
      }
      if (word.plural !== undefined) {
        if (word.partOfSpeech !== "noun") problems.push(problem(wordWhere, "only nouns have a plural."))
        if (word.plural.trim() === "" || word.plural !== word.plural.trim()) {
          problems.push(problem(wordWhere, "plural must be trimmed and non-empty when present."))
        }
      }
      if (word.spainNote !== undefined) {
        if (word.spainNote.trim() === "" || word.spainNote !== word.spainNote.trim()) {
          problems.push(problem(wordWhere, "spainNote must be trimmed and non-empty when present."))
        }
      }
    })
  }

  return problems
}
