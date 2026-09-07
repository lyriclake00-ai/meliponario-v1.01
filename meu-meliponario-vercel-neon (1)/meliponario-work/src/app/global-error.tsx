"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f4f7f2", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 2px 12px rgba(27,67,50,.08)", textAlign: "center" }}>
            <div style={{ fontSize: 36 }}>🐝</div>
            <h1 style={{ color: "#1b4332", fontSize: 20, margin: "8px 0" }}>Erro no aplicativo</h1>
            <pre style={{ background: "#f8f8f8", padding: 12, borderRadius: 12, fontSize: 11, color: "#c00", textAlign: "left", whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto" }}>
              {error?.message || "Erro desconhecido"}
            </pre>
            <button
              onClick={reset}
              style={{ marginTop: 16, width: "100%", padding: "12px", borderRadius: 12, border: 0, background: "#2d6a4f", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
