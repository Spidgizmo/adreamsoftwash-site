import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary";

type Props = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"a">, "href" | "children" | "className">;

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  ...anchorProps
}: Props) {
  const isExternal = /^https?:\/\//i.test(href);

  const base =
    "inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold shadow-sm transition";
  const styles =
    variant === "secondary"
      ? "border border-zinc-200 bg-white text-zinc-900 hover:bg-brand-50"
      : "bg-brand-700 text-white hover:bg-zinc-900";

  const classes = cx(base, styles, className);

  if (isExternal) {
    return (
      <a href={href} className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  // Internal route
  return (
    <Link href={href} className={classes} {...(anchorProps as any)}>
      {children}
    </Link>
  );
}