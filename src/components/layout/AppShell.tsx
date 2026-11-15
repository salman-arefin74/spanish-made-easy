import {
  BookOpen,
  ClipboardCheck,
  Coffee,
  Gauge,
  RefreshCw,
  WholeWord,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { sections } from '../../app/sections.ts'

const icons: Record<string, LucideIcon> = {
  Progress: Gauge,
  Vocabulary: BookOpen,
  'Sentence Builder': WholeWord,
  Revision: RefreshCw,
  Exams: ClipboardCheck,
  'Real-Life Spanish': Coffee,
}

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-ink text-cream">
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-line px-5 py-4 md:hidden">
        <p className="text-sm font-semibold tracking-wide">Spanish Made Easy</p>
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
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card md:inset-y-0 md:left-0 md:w-60 md:border-t-0 md:border-r"
      >
        <p className="hidden px-4 pt-6 pb-4 text-sm font-semibold tracking-wide md:block">
          Spanish Made Easy
        </p>
        <ul className="grid grid-cols-6 md:flex md:flex-col md:gap-1 md:px-3 md:pb-6">
          {sections.map((section) => {
            const Icon = icons[section.label]
            return (
              <li key={section.to} className="min-w-0">
                <NavLink
                  to={section.to}
                  end={section.end}
                  className={({ isActive }) =>
                    [
                      'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-center transition-colors md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-xl md:px-3 md:text-left',
                      isActive
                        ? 'bg-copper text-copper-ink'
                        : 'text-muted hover:bg-raised hover:text-cream',
                    ].join(' ')
                  }
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  <span className="text-[0.7rem] leading-tight md:text-base">
                    {section.label}
                  </span>
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
