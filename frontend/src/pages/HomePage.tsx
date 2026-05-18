export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="bg-white rounded-lg shadow p-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome</h2>
        <p className="text-lg text-gray-600">
          This is your React Vite application with TypeScript and TailwindCSS.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">React</h3>
          <p className="text-gray-600">Building modern UIs with React and Hooks</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Vite</h3>
          <p className="text-gray-600">Lightning fast build tool and dev server</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">TailwindCSS</h3>
          <p className="text-gray-600">Utility-first CSS framework</p>
        </div>
      </section>
    </div>
  )
}
