"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // 개발 환경에서는 SW 비활성화 (캐시 문제 방지)
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
        return;
      }
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
