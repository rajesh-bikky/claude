// The fictional host product BITNIT is plugged into: Ledgerly, invoicing and
// bookkeeping for small businesses. A real integration would send its own ids.

export const PRODUCT_NAME = "Ledgerly";

export const FEATURES: Record<string, string> = {
  invoices: "Invoicing",
  time_tracking: "Time tracking",
  expenses: "Expenses",
  multi_currency: "Multi-currency",
  reports: "Reports",
  client_portal: "Client portal",
};

export const PERSONAS: Record<string, string> = {
  freelancer: "Freelancer",
  agency: "Agency owner",
  accountant: "Accountant",
  smb: "Small-business owner",
};

export const featureLabel = (k: string) => FEATURES[k] ?? k;
export const personaLabel = (k: string) => PERSONAS[k] ?? k;
