"use client"

import * as React from "react"
import { doc } from "firebase/firestore"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import {
  DEFAULT_LANDING_CONTENT,
  LANDING_DOC_PATH,
  mergeLandingContent,
  type LandingContent,
} from "@/lib/landing/content"
import { useResolvedImageMap } from "./use-media-src"

const LandingContentContext = React.createContext<LandingContent>(DEFAULT_LANDING_CONTENT)

/** Public marketing content. Defaults render immediately; stored overrides merge in. */
export function LandingContentProvider({ children }: { children: React.ReactNode }) {
  const db = useFirestore()
  const ref = useMemoFirebase(() => doc(db, LANDING_DOC_PATH), [db])
  const { data } = useDoc(ref)
  const merged = React.useMemo(() => mergeLandingContent(data), [data])
  const images = useResolvedImageMap(merged.images, DEFAULT_LANDING_CONTENT.images)
  const value = React.useMemo(() => ({ ...merged, images }), [merged, images])
  return <LandingContentContext.Provider value={value}>{children}</LandingContentContext.Provider>
}

export function useLandingContent() {
  return React.useContext(LandingContentContext)
}
