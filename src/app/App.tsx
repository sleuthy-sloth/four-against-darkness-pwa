import TabBar from '../components/layout/TabBar'
import Router from './router'
import { TextureOverlay } from '../features/common/Ornament'
import TutorialCoach from '../features/tutorial/TutorialCoach'

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <main className="flex min-h-0 flex-1 flex-col">
        <Router />
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
