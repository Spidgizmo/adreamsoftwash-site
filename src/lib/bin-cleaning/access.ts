import type { AppRole } from "./domain.ts";

export type PrivateArea = "portal" | "crm" | "field";

export function areaForPath(path: string): PrivateArea | null {
  return path.startsWith("/bin-cleaning/portal")
    ? "portal"
    : path.startsWith("/bin-cleaning/crm")
      ? "crm"
      : path.startsWith("/bin-cleaning/field")
        ? "field"
        : null;
}

export function mayAccess(role: AppRole, area: PrivateArea) {
  return area === "portal"
    ? role === "customer"
    : area === "crm"
      ? role === "administrator" || role === "dispatcher"
      : role === "administrator" || role === "field_technician";
}

export function roleForIdentity(
  staffRole: AppRole | undefined,
  hasCustomer: boolean,
): AppRole | null {
  return staffRole ?? (hasCustomer ? "customer" : null);
}

export function expired(expiresAtSeconds: number, nowMs = Date.now()) {
  return expiresAtSeconds * 1000 <= nowMs;
}
