"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  PORTAL_PASSWORD_MIN_LENGTH,
  PORTAL_PASSWORD_REQUIREMENTS,
} from "@/lib/bin-cleaning/password-policy";

export function ResetPasswordForm() {
  const [accessToken, setAccessToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "done" | "invalid" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const token = hash.get("access_token") || query.get("access_token") || "";
    const type = hash.get("type") || query.get("type");

    if (!token || (type && type !== "recovery")) {
      setStatus("invalid");
      return;
    }

    setAccessToken(token);
    setStatus("ready");
    window.history.replaceState({}, "", "/bin-cleaning/reset-password");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("The two passwords do not match.");
      return;
    }

    setStatus("saving");
    try {
      const response = await fetch("/api/bin-cleaning/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          password: newPassword,
          confirmPassword,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setStatus(response.status === 401 ? "invalid" : "error");
        setMessage(result.error || "The password could not be updated.");
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("The password could not be updated. Please try again.");
    }
  }

  if (status === "loading") {
    return <p className="card mt-8 p-6">Checking password reset link…</p>;
  }

  if (status === "invalid") {
    return (
      <div className="card mt-8 space-y-4 p-6">
        <p className="font-semibold text-amber-900">
          This password reset link is invalid or has expired.
        </p>
        <Link
          href="/bin-cleaning/forgot-password"
          className="inline-block font-semibold text-brand-700 underline underline-offset-2"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="card mt-8 space-y-4 p-6">
        <p className="font-bold text-emerald-800">Your password has been updated.</p>
        <Link
          href="/bin-cleaning/login"
          className="inline-block rounded-lg bg-brand-700 px-4 py-3 font-bold text-white"
        >
          Sign in with new password
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-8 space-y-5 p-6">
      <label className="block font-semibold">
        New password
        <input
          required
          minLength={PORTAL_PASSWORD_MIN_LENGTH}
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border p-3"
        />
      </label>

      <label className="block font-semibold">
        Confirm new password
        <input
          required
          minLength={PORTAL_PASSWORD_MIN_LENGTH}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border p-3"
        />
      </label>

      <p className="text-sm text-zinc-600">{PORTAL_PASSWORD_REQUIREMENTS}</p>

      {message && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">
          {message}
        </p>
      )}

      <button
        disabled={status === "saving"}
        className="w-full rounded-lg bg-brand-700 p-3 font-bold text-white disabled:opacity-60"
        type="submit"
      >
        {status === "saving" ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
