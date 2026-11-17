import { BrowserRouter, Route, Routes } from "react-router"
import { sections, type Section } from "./app/sections.ts"
import { AppShell } from "./components/layout/AppShell.tsx"
import { EmptyState } from "./components/ui/EmptyState.tsx"
import { PageHeading } from "./components/ui/PageHeading.tsx"
import { OnboardingPage } from "./features/auth/OnboardingPage.tsx"
import { PrivacyPage } from "./features/auth/PrivacyPage.tsx"
import { AuthProvider, RequireAuth, type AuthState } from "./features/auth/RequireAuth.tsx"
import { SettingsPage } from "./features/auth/SettingsPage.tsx"
import { SignInPage } from "./features/auth/SignInPage.tsx"
import { SignUpPage } from "./features/auth/SignUpPage.tsx"
import { ExamPage } from "./features/exams/ExamPage.tsx"
import { ProgressBoard } from "./features/progress/ProgressBoard.tsx"
import { ReviewPage } from "./features/revision/ReviewSession.tsx"
import { LessonRoute, SentenceBuilderPage } from "./features/sentence-builder/LessonPage.tsx"
import { VocabularyPage } from "./features/vocabulary/CategoryList.tsx"
import { VocabularySessionPage } from "./features/vocabulary/FlashcardSession.tsx"

function StudyPage({ section }: { section: Section }) {
  return (
    <>
      <PageHeading title={section.label} lede={section.lede} />
      <EmptyState>{section.empty}</EmptyState>
    </>
  )
}

export function App({ initialAuth }: { initialAuth?: AuthState } = {}) {
  return (
    <BrowserRouter>
      <AuthProvider initialAuth={initialAuth}>
        <AppShell>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/"
              element={
                <RequireAuth allow="ready">
                  <ProgressBoard />
                </RequireAuth>
              }
            />
            <Route
              path="/revision"
              element={
                <RequireAuth allow="ready">
                  <ReviewPage />
                </RequireAuth>
              }
            />
            <Route
              path="/exams"
              element={
                <RequireAuth allow="ready">
                  <ExamPage />
                </RequireAuth>
              }
            />
            <Route
              path="/vocabulary"
              element={
                <RequireAuth allow="ready">
                  <VocabularyPage />
                </RequireAuth>
              }
            />
            <Route
              path="/vocabulary/:categoryId"
              element={
                <RequireAuth allow="ready">
                  <VocabularySessionPage />
                </RequireAuth>
              }
            />
            <Route
              path="/sentence-builder"
              element={
                <RequireAuth allow="ready">
                  <SentenceBuilderPage />
                </RequireAuth>
              }
            />
            <Route
              path="/sentence-builder/:topicId"
              element={
                <RequireAuth allow="ready">
                  <LessonRoute />
                </RequireAuth>
              }
            />
            {sections
              .filter((section) => !["/", "/vocabulary", "/sentence-builder", "/revision", "/exams"].includes(section.to))
              .map((section) => (
                <Route
                  key={section.to}
                  path={section.to}
                  element={
                    <RequireAuth allow="ready">
                      <StudyPage section={section} />
                    </RequireAuth>
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
      </AuthProvider>
    </BrowserRouter>
  )
}
