"use client";

import { useState } from "react";
import { moneyExact } from "@/lib/format";

export function CostRevealButton({ pieceId }: { pieceId: string }) {
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "loading" } | { kind: "ok"; cost: number | null } | { kind: "err"; msg: string }
  >({ kind: "idle" });

  async function reveal() {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/pieces/${pieceId}/cost`);
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Request failed" }));
        setState({ kind: "err", msg: error || `HTTP ${res.status}` });
        return;
      }
      const { cost } = await res.json();
      setState({ kind: "ok", cost });
    } catch (e) {
      setState({ kind: "err", msg: e instanceof Error ? e.message : "Network error" });
    }
  }

  if (state.kind === "ok") {
    return (
      <div className="mt-3 pt-3 border-t border-dashed border-neutral-300 dark:border-neutral-700">
        <div className="text-xs text-neutral-500">Cost (owner only)</div>
        <div className="text-base font-medium">{state.cost == null ? "—" : moneyExact(state.cost)}</div>
      </div>
    );
  }

  return (
    <button
      onClick={reveal}
      disabled={state.kind === "loading"}
      className="mt-3 text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 disabled:opacity-50"
    >
      {state.kind === "loading" ? "Loading…" : state.kind === "err" ? `Error: ${state.msg}` : "Show cost"}
    </button>
  );
}
