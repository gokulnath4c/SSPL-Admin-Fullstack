import { Outlet } from 'react-router-dom'

interface MainLayoutProps {
  children?: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <nav className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">React Vite App</h1>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children || <Outlet />}
      </main>
    </div>
  )
}
