import { BrowserRouter, Route, Routes } from 'react-router'
import { sections } from './app/sections.ts'
import { AppShell } from './components/layout/AppShell.tsx'
import { EmptyState } from './components/ui/EmptyState.tsx'
import { PageHeading } from './components/ui/PageHeading.tsx'

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {sections.map((section) => (
            <Route
              key={section.to}
              path={section.to}
              element={
                <>
                  <PageHeading title={section.label} lede={section.lede} />
                  <EmptyState>{section.empty}</EmptyState>
                </>
              }
            />
          ))}
          <Route
            path="*"
            element={
              <>
                <PageHeading
                  title="Page not found"
                  lede="That address is not part of Spanish Made Easy."
                />
                <EmptyState>
                  Use the navigation to open Progress, Vocabulary, Sentence
                  Builder, Revision, Exams, or Real-Life Spanish.
                </EmptyState>
              </>
            }
          />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
