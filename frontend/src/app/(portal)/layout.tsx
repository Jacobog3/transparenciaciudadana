import { PortalLayout } from "@/components/portal-layout";

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalLayout>{children}</PortalLayout>;
}
