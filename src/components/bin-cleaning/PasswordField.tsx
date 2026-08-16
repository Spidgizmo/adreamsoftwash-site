"use client";

import { useState } from "react";
import { PORTAL_PASSWORD_MIN_LENGTH } from "@/lib/bin-cleaning/password-policy";

export function PasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block font-semibold">
      Password
      <div className="relative mt-2">
        <input
          required
          minLength={PORTAL_PASSWORD_MIN_LENGTH}
          type={visible ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          className="w-full rounded-lg border p-3 pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-600 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600"
        >
          {visible ? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 002.8 2.8" />
              <path d="M9.9 4.2A10.6 10.6 0 0112 4c5.5 0 9 5.5 9 8a9.8 9.8 0 01-2.1 3.6" />
              <path d="M6.2 6.2C4.1 7.7 3 10.2 3 12c0 2.5 3.5 8 9 8a9.8 9.8 0 004.1-.9" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7S18 19 12 19 2.5 12 2.5 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
