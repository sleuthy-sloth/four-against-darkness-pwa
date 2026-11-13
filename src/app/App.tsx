import TabBar from '../components/layout/TabBar'
import Router from './router'
import { TextureOverlay } from '../features/common/Ornament'
import TutorialCoach from '../features/tutorial/TutorialCoach'
import InstallPrompt from '../features/common/InstallPrompt'

export default function App() {
  return (
    // Milestone 5 (Phase F): on desktop the app is a centered 1080px shell;
    // phones keep the full-width column. Bottom tabs stay on every size.
    <div className="mx-auto flex h-full w-full flex-col lg:max-w-[1080px] lg:border-x lg:border-stone-700">
      <main className="flex min-h-0 flex-1 flex-col">
        {/* Stream 1 (animation round): tab switches crossfade/slide via
            <ScreenTransition> inside <Router /> — the old keyed
            .tab-fade wrapper is retired; the tab bar stays fixed below. */}
        <Router />
      </main>
      {/* Milestone 4: the how-to-play coach sits above the tab bar while a
          tutorial campaign is live; null otherwise. */}
      <TutorialCoach />
      {/* Phase H: the install sheet shows once after the first delve;
          null until then. */}
      <InstallPrompt />
      <TabBar />
      {/* C7 parchment grain over the whole app — fixed, pointer-transparent */}
      <TextureOverlay />
    </div>
  )
}
