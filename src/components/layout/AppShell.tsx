import {
  BookOpen,
  ClipboardCheck,
  Coffee,
  Gauge,
  LogIn,
  RefreshCw,
  Shield,
  UserPlus,
  WholeWord,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { NavLink } from "react-router"
import { sections } from "../../app/sections.ts"
import { useAuth } from "../../features/auth/RequireAuth.tsx"

const studyIcons: Record<string, LucideIcon> = {
  Progress: Gauge,
  Vocabulary: BookOpen,
  "Sentence Builder": WholeWord,
  Revision: RefreshCw,
  Exams: ClipboardCheck,
  "Real-Life Spanish": Coffee,
}

const accountLinks = [
  { to: "/sign-in", label: "Sign in", icon: LogIn, end: true },
  { to: "/sign-up", label: "Create account", icon: UserPlus, end: false },
  { to: "/privacy", label: "Privacy", icon: Shield, end: false },
]

function itemClass(isActive: boolean) {
  return [
    "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-center transition-colors md:min-h-11 md:w-full md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-left",
    isActive ? "bg-copper text-copper-ink" : "text-muted hover:bg-raised hover:text-cream",
  ].join(" ")
}

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const auth = useAuth()
  const showStudyNav = auth.status === "ready"
  const showAccountNav = auth.status === "signed-out"
  const showSignOut =
    auth.status === "ready" ||
    auth.status === "needs-onboarding" ||
    auth.status === "profile-missing"

  return (
    <div className="min-h-dvh bg-ink text-cream">
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 md:hidden">
        <p className="text-sm font-semibold tracking-wide">
          {showStudyNav ? auth.profile?.username : "Spanish Made Easy"}
        </p>
        {showSignOut ? (
          <nav aria-label="Account" className="flex gap-3 text-sm">
            {showStudyNav ? (
              <NavLink className="underline decoration-copper underline-offset-4" to="/settings">
                Settings
              </NavLink>
            ) : null}
            <button
              type="button"
              className="underline decoration-copper underline-offset-4"
              onClick={() => void auth.signOut()}
            >
              Sign out
            </button>
          </nav>
        ) : null}
      </header>
      <div className="md:pl-60">
        <main
          id="content"
          className="mx-auto w-full max-w-3xl px-5 pt-8 pb-28 md:px-10 md:py-12"
        >
          {children}
        </main>
      </div>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:border-t-0 md:border-r"
      >
        <p className="hidden px-4 pt-6 pb-4 text-sm font-semibold tracking-wide md:block">
          Spanish Made Easy
        </p>
        <ul
          className={
            showStudyNav
              ? "grid grid-cols-6 md:flex md:flex-col md:gap-1 md:px-3"
              : "grid grid-cols-3 md:flex md:flex-col md:gap-1 md:px-3"
          }
        >
          {showStudyNav
            ? sections.map((section) => {
                const Icon = studyIcons[section.label]
                return (
                  <li key={section.to} className="min-w-0">
                    <NavLink
                      to={section.to}
                      end={section.end}
                      className={({ isActive }) => itemClass(isActive)}
                    >
                      <Icon aria-hidden="true" className="size-5 shrink-0" />
                      <span className="text-[0.7rem] leading-tight md:text-base">
                        {section.label}
                      </span>
                    </NavLink>
                  </li>
                )
              })
            : null}
          {showAccountNav
            ? accountLinks.map((link) => {
                const Icon = link.icon
                return (
                  <li key={link.to} className="min-w-0">
                    <NavLink
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) => itemClass(isActive)}
                    >
                      <Icon aria-hidden="true" className="size-5 shrink-0" />
                      <span className="text-[0.7rem] leading-tight md:text-base">{link.label}</span>
                    </NavLink>
                  </li>
                )
              })
            : null}
          {auth.status === "needs-onboarding" ? (
            <li className="min-w-0">
              <NavLink to="/onboarding" className={({ isActive }) => itemClass(isActive)}>
                <span className="text-[0.7rem] leading-tight md:text-base">Finish setup</span>
              </NavLink>
            </li>
          ) : null}
        </ul>
        {showSignOut ? (
          <div className="hidden px-3 pt-4 pb-6 md:block">
            {showStudyNav ? (
              <NavLink to="/settings" className={({ isActive }) => itemClass(isActive)}>
                Settings
              </NavLink>
            ) : null}
            <button
              type="button"
              className={`${itemClass(false)} mt-2`}
              onClick={() => void auth.signOut()}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </nav>
    </div>
  )
}
