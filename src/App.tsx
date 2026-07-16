import { Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { Layout } from './components/Layout'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { LibraryPage } from './pages/LibraryPage'
import { ConverterPage } from './pages/ConverterPage'

export default function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/convert" replace />} />
          <Route path="/convert" element={<ConverterPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="*" element={<Navigate to="/convert" replace />} />
        </Routes>
      </Layout>
      <Analytics />
    </>
  )
}
