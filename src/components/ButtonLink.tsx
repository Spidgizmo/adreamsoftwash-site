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
    "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-extrabold shadow-lg transition duration-200 hover:-translate-y-0.5";
  const styles =
    variant === "secondary"
      ? "border border-brand-300 bg-white text-brand-900 shadow-brand-950/10 hover:border-brand-500 hover:bg-brand-50"
      : "bg-red-600 text-white shadow-red-950/25 hover:bg-red-700";

  const classes = cx(base, styles, className);

  if (isExternal) {
    return (
      <a href={href} className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...(anchorProps as any)}>
      {children}
    </Link>
  );
}
