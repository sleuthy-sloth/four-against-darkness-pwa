import TabBar from '../components/layout/TabBar'
import Router from './router'
import { TextureOverlay } from '../features/common/Ornament'

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <main className="flex min-h-0 flex-1 flex-col">
        <Router />
      </main>
      <TabBar />
      {/* C7 parchment grain over the whole app — fixed, pointer-transparent */}
      <TextureOverlay />
    </div>
  )
}
