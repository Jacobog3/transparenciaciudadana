import { Suspense } from "react";
import { PortalLayout } from "@/components/portal-layout";

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense>
      <PortalLayout>{children}</PortalLayout>
    </Suspense>
  );
}
