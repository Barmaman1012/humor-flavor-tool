import { ReactNode } from "react";

import AppHeader from "./AppHeader";
import AppNav from "./AppNav";

type AppShellProps = {
  children: ReactNode;
  email?: string | null;
};

export default function AppShell({ children, email }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <aside className="hidden w-64 flex-col border-r border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <div className="mb-10 text-lg font-semibold">Humor Flavor Tool</div>
        <AppNav />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader email={email} />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
