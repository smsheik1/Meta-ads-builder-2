import React from 'react';

type BuilderErrorBoundaryState = {
  hasError: boolean;
};

type BuilderErrorBoundaryProps = {
  children: React.ReactNode;
};

export class BuilderErrorBoundary extends React.Component<BuilderErrorBoundaryProps, BuilderErrorBoundaryState> {
  declare readonly props: BuilderErrorBoundaryProps;

  state: BuilderErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Wiggly builder crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F4EC] px-6 font-sans text-slate-950">
        <section className="max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-950/10">
          <img src="/wiggly-logo.svg" alt="Wiggly" className="mx-auto h-12 w-12 rounded-2xl shadow-sm" />
          <h1 className="mt-4 text-2xl font-black tracking-normal">Wiggly hit a snag.</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Your browser session stayed open. Refresh and you should be right back in the builder.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
          >
            Refresh Wiggly
          </button>
        </section>
      </main>
    );
  }
}
