"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Meu Meliponário] erro:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-melibg p-4">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="text-4xl">🐝</div>
        <h1 className="mt-2 text-xl font-extrabold text-melidark">Algo deu errado</h1>
        <p className="mt-2 text-sm text-gray-500">
          Não foi possível carregar esta tela. Tente novamente.
        </p>
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-left text-[11px] text-red-600">
          {error?.message || "Erro desconhecido"}
        </pre>
        <div className="mt-4 flex gap-2">
          <button onClick={reset} className="btn-primary flex-1 rounded-xl py-3 font-bold">
            Tentar novamente
          </button>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-gray-600"
          >
            Ir para o início
          </button>
        </div>
      </div>
    </div>
  );
}
