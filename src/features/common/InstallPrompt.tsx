import { useEffect, useRef, useState } from 'react'
import { useDungeonStore } from '../../state/dungeonStore'
import { useTutorialStore } from '../tutorial/tutorialStore'
import {
  INSTALL_PROMPT_EVENT,
  dismissPrompt,
  hasDelved,
  isDismissed,
  isInstalled,
  isIOSDevice,
  isStandaloneMode,
  markDelved,
  markInstalled,
  markShown,
  shouldShowPrompt,
  wasShown,
} from './installPrompt'

/** The deferred native install prompt (Android/desktop Chrome). */
interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return isStandaloneMode(
    (q) => window.matchMedia(q),
    (navigator as { standalone?: unknown }).standalone,
  )
}

/**
 * Install prompt (Phase H): a custom, manuscript-styled sheet shown once
 * after the first delve — never on first paint, never nagging.
 *
 * - iOS Safari has no beforeinstallprompt, so iOS gets guided
 *   Share → Add to Home Screen steps.
 * - Android/desktop Chrome gets the native install flow via the captured
 *   beforeinstallprompt event (or generic menu guidance if the event never
 *   fired).
 * - Dismissal sticks: one auto-showing ever; the sheet stays available
 *   from Settings ("Install the app").
 * - The sheet waits for a quiet moment: no combat up, no choice dialog,
 *   no tutorial coach running.
 */
export default function InstallPrompt() {
  const dungeon = useDungeonStore((s) => s.dungeon)
  const tutorialActive = useTutorialStore((s) => s.active !== null)
  const [deferred, setDeferred] = useState<DeferredInstallPrompt | null>(null)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<number | null>(null)

  // Capture the Android install event as early as possible; the native
  // `appinstalled` event marks the install so the prompt never returns.
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as unknown as DeferredInstallPrompt)
    }
    const onInstalled = () => {
      markInstalled(localStorage)
      setOpen(false)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // A delve has happened once the dungeon grows past the entrance tile,
  // or a combat is won. Durable in localStorage so the prompt survives a
  // cold start, when the dungeon store is empty until the dungeon tab loads.
  useEffect(() => {
    if (!dungeon) return
    if (dungeon.tiles.length > 1 || dungeon.combat?.phase === 'won') markDelved(localStorage)
  }, [dungeon])

  // Forced open from Settings ("Install the app") — available even after
  // the one auto-showing, but never when already installed.
  useEffect(() => {
    const onForce = () => {
      if (isStandalone() || isInstalled(localStorage)) return
      setOpen(true)
    }
    window.addEventListener(INSTALL_PROMPT_EVENT, onForce)
    return () => window.removeEventListener(INSTALL_PROMPT_EVENT, onForce)
  }, [])

  // Auto-show once, after the first delve, once the screen is quiet: the
  // 1.2s settle lets the new room render before the sheet slides up, and
  // the timer restarts while the player keeps acting.
  useEffect(() => {
    if (open) return
    const gate = {
      delved: hasDelved(localStorage),
      dismissed: isDismissed(localStorage),
      shown: wasShown(localStorage),
      installed: isInstalled(localStorage),
      standalone: isStandalone(),
      hasActiveCombat: dungeon?.combat != null,
      hasPendingChoice: dungeon?.pendingChoice != null,
      tutorialActive,
    }
    if (!shouldShowPrompt(gate)) return
    timerRef.current = window.setTimeout(() => {
      markShown(localStorage)
      setOpen(true)
    }, 1200)
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [dungeon, tutorialActive, open])

  if (!open) return null

  const ios = isIOSDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)

  const dismiss = () => {
    dismissPrompt(localStorage)
    setOpen(false)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') markInstalled(localStorage)
    else dismissPrompt(localStorage)
    setDeferred(null)
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 px-3 pb-16"
      role="dialog"
      aria-modal="true"
      aria-label="Install Four Against Darkness"
    >
      <div className="card-folio w-full max-w-md p-4">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
            alt=""
            aria-hidden="true"
            className="h-12 w-12 rounded-[2px] border border-parchment"
          />
          <div>
            <p className="font-display text-lg text-torch">Take the tome with you</p>
            <p className="text-xs text-faint">Four Against Darkness</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-parchment">
          Install Four Against Darkness — it plays offline after install, no account, no
          signal needed.
        </p>
        {ios ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-parchment">
            <li>Tap the Share button in Safari — the box with the arrow.</li>
            <li>Scroll down and tap “Add to Home Screen”.</li>
            <li>Tap “Add”. The tome lands on your home screen.</li>
          </ol>
        ) : (
          !deferred && (
            <p className="mt-2 text-sm text-parchment">
              Open your browser menu and choose “Install app”.
            </p>
          )
        )}
        <div className="mt-3 flex gap-2">
          {!ios && deferred && (
            <button onClick={() => void install()} className="btn-wax flex-1 px-4 py-2 text-sm">
              Install
            </button>
          )}
          <button onClick={dismiss} className="btn-cartouche flex-1 px-4 py-2 text-sm">
            {ios ? 'Got it' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  )
}
