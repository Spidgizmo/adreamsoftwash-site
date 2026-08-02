export const FICTIONAL_CUSTOMERS = [
  { id: "test-customer-monthly", name: "Avery Sample", email: "avery@example.test", phone: "(555) 010-1001", status: "active", plan: "Monthly", municipality: "Test Township", pickup: "Monday", cleaning: "Tuesday", bins: 1, next: "Aug 11, 2026" },
  { id: "test-customer-quarterly", name: "Jordan Example", email: "jordan@example.test", phone: "(555) 010-1002", status: "active", plan: "Quarterly", municipality: "Demo Village", pickup: "Friday", cleaning: "Saturday", bins: 4, next: "Aug 15, 2026" },
  { id: "test-customer-twice", name: "Morgan Fiction", email: "morgan@example.test", phone: "(555) 010-1003", status: "pending review", plan: "Twice a Year", municipality: "Test Township", pickup: "Unverified", cleaning: "Pending", bins: 2, next: "Not scheduled" },
  { id: "test-customer-onetime", name: "Riley Placeholder", email: "riley@example.test", phone: "(555) 010-1004", status: "active", plan: "One-Time Cleaning", municipality: "Demo Village", pickup: "Wednesday", cleaning: "Thursday", bins: 2, next: "Aug 13, 2026" },
] as const;
export const TEST_VISITS = [
  { id: "visit-weather", customer: "Jordan Example", address: "20 Fictional Lane, Demo Village, OH 00000", status: "Weather delayed", date: "Aug 8, 2026" },
  { id: "visit-complete", customer: "Avery Sample", address: "10 Sample Street, Test Township, OH 00000", status: "Completed", date: "Aug 4, 2026" },
  { id: "visit-inaccessible", customer: "Morgan Fiction", address: "30 Mockingbird Court, Test Township, OH 00000", status: "Customer not ready", date: "Aug 6, 2026" },
] as const;
