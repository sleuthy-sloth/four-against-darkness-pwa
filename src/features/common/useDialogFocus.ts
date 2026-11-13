import { useEffect, useRef } from 'react'

/**
 * Focus management for modal sheets (Phase G).
 *
 * On open: remember the element that had focus, move focus to the first
 * focusable control inside the dialog. While open: Tab cycles inside the
 * dialog (a trap), Escape calls `onClose` when the dialog is dismissible.
 * On close: return focus to the element that opened it.
 *
 * Pass no `onClose` for mandatory choices (ChoiceDialog) — Tab still
 * traps, but there is nothing to Escape to; the choice must be made.
 * The hook stops keydown propagation while open, so the dungeon screen's
 * global shortcuts never fire behind a sheet.
 */
export function useDialogFocus<T extends HTMLElement>(
  open: boolean,
  onClose?: () => void,
) {
  const ref = useRef<T | null>(null)
  const previousFocus = useRef<Element | null>(null)
  // onClose may be an inline arrow — hold it in a ref so the effect does
  // not re-run (and re-focus) on every parent render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const el = ref.current
    if (!el) return
    previousFocus.current = document.activeElement
    const focusables = () =>
      [...el.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((n) => n.offsetParent !== null)
    focusables()[0]?.focus()
    const onFocusOut = () => {
      // A focused option can disable under the user (a failed pick
      // disables its button) and the browser drops focus to the page
      // behind the modal — the trap must pull it back inside, or Tab
      // from out there can never reach the dialog's remaining options
      // (they sit late in DOM order). Recover on the next tick, once
      // the new activeElement has settled.
      window.setTimeout(() => {
        const host = ref.current
        if (!host || !document.contains(host)) return
        const ae = document.activeElement as Element | null
        if (ae && host.contains(ae)) return
        focusables()[0]?.focus()
      }, 0)
    }
    el.addEventListener('focusout', onFocusOut)
    const onKey = (e: KeyboardEvent) => {
      // Modal means modal: nothing behind the sheet sees these keys.
      e.stopPropagation()
      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    el.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('keydown', onKey)
      el.removeEventListener('focusout', onFocusOut)
      const prev = previousFocus.current as HTMLElement | null
      // The opener may have unmounted while the sheet was open (a move
      // replaces the map's discs) — focusing a detached node is a no-op,
      // so the user lands on the page and Tabs from there.
      prev?.focus?.()
    }
  }, [open])

  return ref
}
