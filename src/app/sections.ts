export type Section = {
  to: string
  label: string
  lede: string
  empty: string
  end?: boolean
}

export const sections: Section[] = [
  {
    to: '/',
    label: 'Progress',
    end: true,
    lede: 'Your study, once there is something to show.',
    empty:
      'Progress reads your own words, reviews, and exams. This page does not show sample scores.',
  },
  {
    to: '/vocabulary',
    label: 'Vocabulary',
    lede: 'Words for everyday Spanish from Spain.',
    empty:
      'Choose a category once the word bank is seeded. There is no sample deck on this page.',
  },
  {
    to: '/sentence-builder',
    label: 'Sentence Builder',
    lede: 'How words become sentences.',
    empty:
      'Lessons open after the grammar tables are seeded. This page does not show sample sentences.',
  },
  {
    to: '/revision',
    label: 'Revision',
    lede: 'Words that are ready to review.',
    empty: 'Revision opens after the review SQL is applied. This page does not show a sample queue.',
  },
  {
    to: '/exams',
    label: 'Exams',
    lede: 'A check on what you can actually do.',
    empty: 'Exams open after the word bank is seeded. This page does not show sample questions.',
  },
  {
    to: '/real-life-spanish',
    label: 'Real-Life Spanish',
    lede: 'Spanish for situations you will actually be in.',
    empty:
      'Real-Life Spanish is not built yet. Situations and dialogues are not available.',
  },
]
