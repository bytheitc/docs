import type { Metadata } from "next";
import "./admin.css";
import "./theme.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

// The admin is always rendered per request: it shows private, changing data.
export const dynamic = "force-dynamic";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="cms">{children}</div>;
}
