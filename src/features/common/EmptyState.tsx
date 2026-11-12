import type { ReactNode } from 'react'

/**
 * Illustrated empty states (plan item B6): a small line-art vignette, one
 * line of voice, and the action button — instead of bare faint text.
 * Vignettes are original ink line art in the lockup's style (stroke ink,
 * one oxblood accent), drawn inline so nothing new is fetched.
 */

function VignetteFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 120 80"
      role="img"
      aria-label={label}
      className="h-20 w-auto text-parchment"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function TomeVignette() {
  return (
    <VignetteFrame label="A closed tome">
      <path d="M22 22 C 42 14, 58 14, 60 22 L60 62 C 44 54, 30 54, 22 62 Z" />
      <path d="M98 22 C 78 14, 62 14, 60 22 L60 62 C 76 54, 90 54, 98 62 Z" />
      <circle cx="60" cy="46" r="7" fill="#8c2626" stroke="none" />
    </VignetteFrame>
  )
}

function PartyVignette() {
  return (
    <VignetteFrame label="Four empty roundels awaiting adventurers">
      <circle cx="24" cy="34" r="12" />
      <circle cx="48" cy="34" r="12" />
      <circle cx="72" cy="34" r="12" />
      <circle cx="96" cy="34" r="12" />
      <path d="M18 58 H102" />
      <path d="M60 58 v8" />
      <circle cx="60" cy="70" r="3" fill="#8c2626" stroke="none" />
    </VignetteFrame>
  )
}

function JournalVignette() {
  return (
    <VignetteFrame label="A blank page and a quill">
      <path d="M28 14 H84 V66 H28 Z" />
      <path d="M36 26 H76 M36 34 H76 M36 42 H62" strokeWidth="1.5" />
      <path d="M88 54 C 96 44, 100 34, 98 24 C 90 30, 86 42, 88 54 Z" />
    </VignetteFrame>
  )
}

function PackVignette() {
  return (
    <VignetteFrame label="An empty adventurer's pack">
      <path d="M38 26 C 38 18, 82 18, 82 26 L88 62 C 88 68, 32 68, 32 62 Z" />
      <path d="M38 26 C 48 34, 72 34, 82 26" />
      <path d="M52 26 V18 M68 26 V18" />
      <circle cx="60" cy="46" r="5" fill="#8c2626" stroke="none" />
    </VignetteFrame>
  )
}

const VIGNETTES = {
  campaign: TomeVignette,
  party: PartyVignette,
  journal: JournalVignette,
  inventory: PackVignette,
} as const

export type EmptyStateKind = keyof typeof VIGNETTES

export default function EmptyState({
  kind,
  title,
  body,
  action,
}: {
  kind: EmptyStateKind
  title: string
  body: string
  action?: ReactNode
}) {
  const Vignette = VIGNETTES[kind]
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <Vignette />
      <p className="font-display text-base text-parchment">{title}</p>
      <p className="max-w-xs text-sm text-parchment/70">{body}</p>
      {action}
    </div>
  )
}
