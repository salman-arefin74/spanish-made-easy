type EmptyStateProps = {
  children: string
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <p className="mt-8 max-w-prose rounded-2xl border border-line bg-card px-6 py-8 text-lg leading-relaxed text-cream">
      {children}
    </p>
  )
}
