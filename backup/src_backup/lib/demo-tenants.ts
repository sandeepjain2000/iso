/** Demo orgs shown on the landing page; passwords are seeded separately. */
export const DEMO_PASSWORD = "Admin@123" as const;

export type DemoTenant = {
  slug: string;
  name: string;
  email: string;
};

export const DEMO_TENANTS: readonly DemoTenant[] = [
  {
    slug: "unique-schools",
    name: "Unique Schools",
    email: "admin.unique@campus-placement.work",
  },
  {
    slug: "jadavpur-university",
    name: "Jadavpur University",
    email: "admin.vit@campus-placement.work",
  },
  {
    slug: "vit",
    name: "Vellore Institute of Technology",
    email: "admin.dtu@campus-placement.work",
  },
  {
    slug: "dtu",
    name: "Delhi Technological University",
    email: "admin.iiith@campus-placement.work",
  },
  {
    slug: "iit-madras",
    name: "Indian Institute of Technology Madras",
    email: "admin@iitm.edu",
  },
] as const;
