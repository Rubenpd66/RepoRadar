"use client";
import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/app/actions";
export function MutationForm({
  action,
  children,
  label = "Guardar",
  className = "",
  variant = "primary",
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: ReactNode;
  label?: string;
  className?: string;
  variant?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  return (
    <form action={dispatch} className={className}>
      {children}
      <button className={`button ${variant}`} disabled={pending}>
        {pending ? "Guardando…" : label}
      </button>
      <span
        role="status"
        className={state.error ? "form-error" : "form-success"}
      >
        {state.error ?? state.success}
      </span>
    </form>
  );
}
