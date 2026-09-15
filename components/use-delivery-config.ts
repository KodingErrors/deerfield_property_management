"use client";

import { useEffect, useState } from "react";
import { DEFAULT_RECIPIENT } from "@/lib/inquiry-format.js";

export type DeliveryConfig = { recipient: string; from: string | null };

// Ask the server where inquiries actually go instead of hardcoding an address in the
// review dialogs. Falls back to the compiled-in default if /api is unreachable.
export function useDeliveryConfig(): DeliveryConfig {
  const [config, setConfig] = useState<DeliveryConfig>({ recipient: DEFAULT_RECIPIENT, from: null });
  useEffect(() => {
    let cancelled = false;
    fetch("/api/inquiry-config", { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { recipient?: string; from?: string | null } | null) => {
        if (cancelled || !data) return;
        setConfig({ recipient: data.recipient || DEFAULT_RECIPIENT, from: data.from || null });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return config;
}
