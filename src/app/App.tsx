import TabBar from '../components/layout/TabBar'
import Router from './router'

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <main className="flex min-h-0 flex-1 flex-col">
        <Router />
      </main>
      <TabBar />
    </div>
  )
}
