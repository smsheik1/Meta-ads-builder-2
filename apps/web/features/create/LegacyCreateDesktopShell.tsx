import type { ReactNode } from 'react';
import { CreatePageHeader } from './CreatePageHeader';

type LegacyCreateDesktopShellProps = {
  audioPanel?: ReactNode;
  canvas: ReactNode;
  captionEditor?: ReactNode;
  leftColumn: ReactNode;
  rightColumn: ReactNode;
};

export function LegacyCreateDesktopShell({
  audioPanel,
  canvas,
  captionEditor,
  leftColumn,
  rightColumn,
}: LegacyCreateDesktopShellProps) {
  return (
    <main className="min-h-screen min-w-[1280px] bg-[#F7F4EA] px-10 py-4 font-sans text-slate-950">
      <CreatePageHeader />

      <section className="mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-7xl grid-cols-[0.82fr_1.18fr] items-center gap-16 py-10">
        <div className="max-w-xl">
          {leftColumn}
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(260px,420px)_minmax(260px,1fr)] items-center gap-6">
          <div className="min-w-0">
            {canvas}
          </div>

          <aside className="space-y-5 pt-24">
            {rightColumn}
          </aside>

          {audioPanel}
        </div>
        {captionEditor}
      </section>
    </main>
  );
}
