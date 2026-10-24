import { useCallback, useEffect, useRef, useState } from "react"

export type View = "templates" | "editor" | "result"
export type Tool = "photo" | "text" | "layout" | "palette"

export interface Route {
  view: View
  /** Open mobile drawer. Drawers get their own history entry so Back closes them first. */
  drawer: Tool | null
  /** View this entry was pushed from; lets in-app Back use real history when it can. */
  prev: View | null
  /** For drawer entries: the `prev` of the editor entry underneath. */
  base: View | null
}

const HASH: Record<View, string> = {
  templates: "#/templates",
  editor: "#/editor",
  result: "#/result",
}

const isView = (v: unknown): v is View =>
  v === "templates" || v === "editor" || v === "result"
const isTool = (v: unknown): v is Tool =>
  v === "photo" || v === "text" || v === "layout" || v === "palette"

function readRoute(): Route {
  const hash = window.location.hash
  const view: View = hash.startsWith(HASH.editor)
    ? "editor"
    : hash.startsWith(HASH.result)
      ? "result"
      : "templates"
  const state = (window.history.state ?? {}) as Record<string, unknown>
  const owned = state.sleeve === true
  return {
    view,
    drawer:
      owned && view === "editor" && isTool(state.drawer) ? state.drawer : null,
    prev: owned && isView(state.prev) ? state.prev : null,
    base: owned && isView(state.base) ? state.base : null,
  }
}

function write(route: Route, replace: boolean) {
  const state = {
    sleeve: true,
    drawer: route.drawer,
    prev: route.prev,
    base: route.base,
  }
  if (replace) window.history.replaceState(state, "", HASH[route.view])
  else window.history.pushState(state, "", HASH[route.view])
}

export interface Nav {
  route: Route
  go(view: View, options?: { replace?: boolean }): void
  /** In-app back: uses history when the previous entry is `view`, otherwise replaces. */
  back(view: View): void
  openDrawer(tool: Tool): void
  closeDrawer(): void
}

export function useRouter(): Nav {
  const [route, setRoute] = useState<Route>(readRoute)
  const ref = useRef(route)

  const commit = useCallback((next: Route, replace: boolean) => {
    write(next, replace)
    ref.current = next
    setRoute(next)
  }, [])

  useEffect(() => {
    const initial = readRoute()
    write(initial, true)
    ref.current = initial
    setRoute(initial)
    const onPop = () => {
      const next = readRoute()
      ref.current = next
      setRoute(next)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const go = useCallback<Nav["go"]>(
    (view, options = {}) => {
      const cur = ref.current
      if (cur.view === view && !cur.drawer && !options.replace) return
      const next: Route = {
        view,
        drawer: null,
        prev: cur.view === view ? cur.prev : cur.view,
        base: null,
      }
      // Leaving through an open drawer replaces the drawer's entry instead of stacking on it.
      commit(next, options.replace === true || cur.drawer !== null)
    },
    [commit],
  )

  const back = useCallback<Nav["back"]>(
    (view) => {
      const cur = ref.current
      if (cur.drawer === null && cur.prev === view) window.history.back()
      else if (
        cur.drawer !== null &&
        cur.prev === "editor" &&
        cur.base === view
      )
        window.history.go(-2)
      else commit({ view, drawer: null, prev: null, base: null }, true)
    },
    [commit],
  )

  const openDrawer = useCallback<Nav["openDrawer"]>(
    (tool) => {
      const cur = ref.current
      if (cur.view !== "editor" || cur.drawer === tool) return
      if (cur.drawer) commit({ ...cur, drawer: tool }, true)
      else
        commit(
          { view: "editor", drawer: tool, prev: "editor", base: cur.prev },
          false,
        )
    },
    [commit],
  )

  const closeDrawer = useCallback<Nav["closeDrawer"]>(() => {
    const cur = ref.current
    if (!cur.drawer) return
    if (cur.prev === "editor") window.history.back()
    else
      commit({ view: cur.view, drawer: null, prev: cur.base, base: null }, true)
  }, [commit])

  return { route, go, back, openDrawer, closeDrawer }
}
