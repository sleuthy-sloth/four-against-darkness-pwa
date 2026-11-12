import { useLocation } from 'react-router-dom'
import TabBar from '../components/layout/TabBar'
import Router from './router'
import { TextureOverlay } from '../features/common/Ornament'
import TutorialCoach from '../features/tutorial/TutorialCoach'

export default function App() {
  const location = useLocation()
  return (
    // Milestone 5 (Phase F): on desktop the app is a centered 1080px shell;
    // phones keep the full-width column. Bottom tabs stay on every size.
    <div className="mx-auto flex h-full w-full flex-col lg:max-w-[1080px] lg:border-x lg:border-stone-700">
      <main className="flex min-h-0 flex-1 flex-col">
        {/* Tab switches crossfade the content area (Phase E, 120ms). */}
        <div key={location.pathname} className="tab-fade flex min-h-0 flex-1 flex-col">
          <Router />
        </div>
      </main>
      {/* Milestone 4: the how-to-play coach sits above the tab bar while a
          tutorial campaign is live; null otherwise. */}
      <TutorialCoach />
      <TabBar />
      {/* C7 parchment grain over the whole app — fixed, pointer-transparent */}
      <TextureOverlay />
    </div>
  )
}
