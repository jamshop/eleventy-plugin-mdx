import { useState } from "react"

export default () => {
  const [state, setState] = useState("with state")
  return `Test JSX Export Works - ${state}`
}