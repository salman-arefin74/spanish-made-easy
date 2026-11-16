import { useRef, useState } from "react"

type Tile = {
  key: string
  label: string
}

export function ConstructExercise({
  tokens,
  onChange,
}: {
  tokens: string[]
  onChange: (sentence: string) => void
}) {
  const [bank] = useState<Tile[]>(() => tokens.map((label, index) => ({ key: String(index), label })))
  const [line, setLine] = useState<string[]>([])
  const dragged = useRef(false)

  function commit(next: string[]) {
    setLine(next)
    const labels = new Map(bank.map((tile) => [tile.key, tile.label]))
    onChange(next.map((key) => labels.get(key) ?? "").join(" "))
  }

  function place(key: string, beforeKey: string | null) {
    if (!bank.some((tile) => tile.key === key) || beforeKey === key) return
    const rest = line.filter((item) => item !== key)
    const index = beforeKey === null ? -1 : rest.indexOf(beforeKey)
    if (index < 0) {
      commit([...rest, key])
      return
    }
    const next = [...rest]
    next.splice(index, 0, key)
    commit(next)
  }

  function remove(key: string) {
    commit(line.filter((item) => item !== key))
  }

  function readDragged(transfer: DataTransfer): string {
    return transfer.getData("text/plain")
  }

  const used = new Set(line)

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <div
        className="sticky top-0 z-10 rounded-2xl border border-line bg-ink p-4 md:static"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const key = readDragged(event.dataTransfer)
          if (key) place(key, null)
        }}
      >
        <p className="text-sm font-semibold text-muted">Your sentence</p>
        {line.length === 0 ? (
          <p className="mt-3 text-lg text-muted">Tap words to build the sentence.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {line.map((key) => {
              const tile = bank.find((item) => item.key === key)
              return (
                <button
                  key={key}
                  type="button"
                  draggable
                  aria-label={tile ? `Remove ${tile.label}` : "Remove"}
                  className="min-h-12 cursor-grab rounded-xl border border-copper bg-card px-3 py-2 text-lg text-cream"
                  onClick={() => {
                    if (dragged.current) return
                    remove(key)
                  }}
                  onDragStart={(event) => {
                    dragged.current = true
                    event.dataTransfer.setData("text/plain", key)
                    event.dataTransfer.effectAllowed = "move"
                  }}
                  onDragEnd={() => {
                    setTimeout(() => {
                      dragged.current = false
                    }, 0)
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const draggedKey = readDragged(event.dataTransfer)
                    if (draggedKey) place(draggedKey, key)
                  }}
                >
                  {tile?.label}
                </button>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-sm text-muted">Drag a word onto another word to place it before that word. Tap a word to remove it.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {bank.map((tile) => (
          <button
            key={tile.key}
            type="button"
            draggable={!used.has(tile.key)}
            className="min-h-12 rounded-xl border border-line bg-raised px-3 py-2 text-lg text-cream disabled:opacity-40"
            disabled={used.has(tile.key)}
            onClick={() => place(tile.key, null)}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", tile.key)
              event.dataTransfer.effectAllowed = "move"
            }}
          >
            {tile.label}
          </button>
        ))}
      </div>
    </div>
  )
}
