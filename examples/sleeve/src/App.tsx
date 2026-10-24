import { useCallback, useEffect, useState } from "react"
import { useRouter } from "./app/router"
import type { TemplateId } from "./cover/types"
import {
  createDraft,
  loadDraft,
  saveDraft,
  switchTemplate,
  type Draft,
} from "./state/draft"
import { EditorView } from "./views/EditorView"
import { ResultView } from "./views/ResultView"
import { TemplatesView } from "./views/TemplatesView"

export default function App() {
  const nav = useRouter()
  const [draft, setDraftState] = useState<Draft | null>(loadDraft)
  const view = nav.route.view

  useEffect(() => {
    saveDraft(draft)
  }, [draft])

  // Editor and result need a draft; a stale deep link falls back to the gallery.
  const missing = !draft && view !== "templates"
  useEffect(() => {
    if (missing) nav.go("templates", { replace: true })
  }, [missing, nav.go])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  const setDraft = useCallback(
    (update: (d: Draft) => Draft) => setDraftState((d) => (d ? update(d) : d)),
    [],
  )

  const pick = (id: TemplateId) => {
    setDraftState((d) => (d ? switchTemplate(d, id) : createDraft(id)))
    nav.go("editor")
  }

  const startOver = () => setDraftState(null)

  if (view === "editor" && draft)
    return <EditorView draft={draft} setDraft={setDraft} nav={nav} />
  if (view === "result" && draft)
    return (
      <ResultView
        draft={draft}
        nav={nav}
        onNew={() => {
          setDraftState(null)
          nav.go("templates", { replace: true })
        }}
      />
    )
  return (
    <TemplatesView
      draft={draft}
      onPick={pick}
      onContinue={() => nav.go("editor")}
      onStartOver={startOver}
    />
  )
}
