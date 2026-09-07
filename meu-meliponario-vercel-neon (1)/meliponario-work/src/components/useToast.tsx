"use client";

import { useState, useCallback } from "react";
import { Toast } from "./ui";

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const show = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const node = toast ? <Toast msg={toast.msg} type={toast.type} /> : null;
  return { show, node };
}
