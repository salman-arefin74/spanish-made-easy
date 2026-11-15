type PageHeadingProps = {
  title: string
  lede: string
}

export function PageHeading({ title, lede }: PageHeadingProps) {
  return (
    <header className="max-w-prose">
      <h1 className="text-3xl font-semibold tracking-tight text-cream md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-muted">{lede}</p>
    </header>
  )
}
