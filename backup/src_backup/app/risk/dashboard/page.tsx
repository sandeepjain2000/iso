import { permanentRedirect } from "next/navigation";

/** Legacy URL: risk home is `/risk`. */
export default function RiskDashboardRedirectPage() {
  permanentRedirect("/risk");
}
