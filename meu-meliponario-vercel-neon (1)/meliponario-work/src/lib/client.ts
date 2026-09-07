"use client";

export async function api<T = unknown>(
  url: string,
  opts?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Erro na requisição");
  }
  return data as T;
}

export async function fileToDataUrl(file: File, maxDim = 1200, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas não suportado"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const STATUS_COLORS: Record<string, string> = {
  Ativa: "bg-green-100 text-green-800",
  Forte: "bg-emerald-100 text-emerald-800",
  Atenção: "bg-amber-100 text-amber-800",
  Fraca: "bg-orange-100 text-orange-800",
  Inativa: "bg-gray-200 text-gray-700",
  Perdida: "bg-red-100 text-red-700",
};

export function notaLabel(n?: number | null) {
  if (n == null) return "—";
  return `Nota ${n}`;
}

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  if (!day) return d;
  return `${day}/${m}/${y}`;
}
