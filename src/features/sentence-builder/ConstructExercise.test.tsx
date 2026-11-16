import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { ConstructExercise } from "./ConstructExercise.tsx"

function Harness() {
  const [sentence, setSentence] = useState("")
  return (
    <>
      <ConstructExercise tokens={["El", "café", "La", "café"]} onChange={setSentence} />
      <p>Built: {sentence}</p>
    </>
  )
}

describe("construct exercise", () => {
  it("adds and removes tiles without collapsing two identical words", () => {
    render(<Harness />)
    const tiles = screen.getAllByRole("button", { name: "café" })
    fireEvent.click(tiles[0]!)
    fireEvent.click(screen.getByRole("button", { name: "El" }))
    expect(screen.getByText("Built: café El")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Remove café" }))
    expect(screen.getByText("Built: El")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "café" })).toHaveLength(2)
  })

  it("drags a placed word in front of an earlier word", () => {
    function Order() {
      const [sentence, setSentence] = useState("")
      return (
        <>
          <ConstructExercise tokens={["una", "casa", "es"]} onChange={setSentence} />
          <p>Built: {sentence}</p>
        </>
      )
    }
    render(<Order />)
    fireEvent.click(screen.getByRole("button", { name: "una" }))
    fireEvent.click(screen.getByRole("button", { name: "casa" }))
    fireEvent.click(screen.getByRole("button", { name: "es" }))
    expect(screen.getByText("Built: una casa es")).toBeInTheDocument()
    const store: Record<string, string> = {}
    const dataTransfer = {
      setData(type: string, value: string) {
        store[type] = value
      },
      getData(type: string) {
        return store[type] ?? ""
      },
      effectAllowed: "move",
    }
    fireEvent.dragStart(screen.getByRole("button", { name: "Remove es" }), { dataTransfer })
    fireEvent.drop(screen.getByRole("button", { name: "Remove una" }), { dataTransfer })
    expect(screen.getByText("Built: es una casa")).toBeInTheDocument()
  })
})
