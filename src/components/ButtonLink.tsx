import Link from "next/link";
import clsx from "clsx";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
};

export function ButtonLink({ href, children, className, variant = "primary" }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-md px-5 py-3 text-center text-sm font-semibold transition shadow-sm";

  const styles = {
    primary:
      "bg-brand-700 text-white hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-300",
    secondary:
      "border border-zinc-200 bg-white text-zinc-900 hover:bg-brand-50 hover:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-200",
    ghost: "text-brand-800 hover:text-brand-900 hover:underline",
  };

  return (
    <Link href={href} className={clsx(base, styles[variant], className)}>
      {children}
    </Link>
  );
}
