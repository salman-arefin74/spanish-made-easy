import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"
import { ExamAnswerForm } from "./ExamPage.tsx"

function Harness({ onCheck }: { onCheck: (value: string) => void }) {
  const [value, setValue] = useState("")
  return <ExamAnswerForm value={value} onChange={setValue} onCheck={() => onCheck(value)} />
}

describe("exam answer field", () => {
  it("checks the typed answer when Enter is pressed", () => {
    const checked: string[] = []
    render(<Harness onCheck={(value) => checked.push(value)} />)
    const field = screen.getByRole("textbox", { name: "Your answer" })
    fireEvent.change(field, { target: { value: "green" } })
    fireEvent.keyDown(field, { key: "Enter" })
    fireEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(checked).toEqual(["green", "green"])
  })

  it("does not check an empty answer from Enter or a click", () => {
    const checked: string[] = []
    render(<Harness onCheck={(value) => checked.push(value)} />)
    const field = screen.getByRole("textbox", { name: "Your answer" })
    fireEvent.keyDown(field, { key: "Enter" })
    fireEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(checked).toEqual([])
  })
})
