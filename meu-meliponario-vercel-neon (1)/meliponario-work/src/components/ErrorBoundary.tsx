"use client";

import { Component, ReactNode } from "react";

type Props = { children: ReactNode; fullScreen?: boolean };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[Meu Meliponário] falha ao renderizar tela:", error);
  }

  render() {
    if (this.state.error) {
      const box = (
        <div className="card mx-auto w-full max-w-md p-6 text-center">
          <div className="text-3xl">🐝</div>
          <h2 className="mt-2 font-extrabold text-melidark">Não foi possível carregar esta tela</h2>
          <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-left text-[11px] text-red-600">
            {this.state.error.message}
          </pre>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="btn-primary flex-1 rounded-xl px-5 py-2.5 font-bold"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-xl border border-gray-200 px-5 py-2.5 font-semibold text-gray-600"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
      if (this.props.fullScreen) {
        return <div className="flex min-h-screen items-center justify-center bg-melibg p-4">{box}</div>;
      }
      return box;
    }
    return this.props.children;
  }
}
