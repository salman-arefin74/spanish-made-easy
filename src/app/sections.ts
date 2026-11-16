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
      'Progress is not built yet. This board will show your own words, reviews, and exams. There is no sample history on this page.',
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
      'Sentence Builder is not built yet. Grammar lessons and sentence exercises are not available.',
  },
  {
    to: '/revision',
    label: 'Revision',
    lede: 'Words that are ready to review.',
    empty: 'Revision is not built yet. There is no review queue.',
  },
  {
    to: '/exams',
    label: 'Exams',
    lede: 'A check on what you can actually do.',
    empty: 'Exams are not built yet. There are no scores to show.',
  },
  {
    to: '/real-life-spanish',
    label: 'Real-Life Spanish',
    lede: 'Spanish for situations you will actually be in.',
    empty:
      'Real-Life Spanish is not built yet. Situations and dialogues are not available.',
  },
]
