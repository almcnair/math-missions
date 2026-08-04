"use client";

/**
 * Form-aware submit button. Reads `pending` from React's `useFormStatus()`
 * hook so any `<form action={serverAction}>` gets automatic loading state
 * without the parent needing to track it manually.
 *
 * Usage:
 *   <form action={createInvite}>
 *     <input name="label" />
 *     <SubmitButton pendingLabel="Sending…">Send invite</SubmitButton>
 *   </form>
 *
 * Note: must be rendered inside a <form>, otherwise `useFormStatus`
 * always returns { pending: false }.
 */

import { useFormStatus } from "react-dom";
import { Button } from "./Button";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Button>, "pending" | "type"> & {
  pendingLabel?: string;
};

export function SubmitButton({
  pendingLabel = "Working…",
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      pending={pending}
      pendingLabel={pendingLabel}
      {...rest}
    />
  );
}
