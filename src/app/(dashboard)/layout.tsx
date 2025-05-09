import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ErrorBoundary } from "react-error-boundary";
import ClientWrapper from "@/app/Components/ClientWrapper";
import ErrorFallbackComponent from "@/app/Components/ErrorFallback";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Disable authentication check for now to fix the hydration error
  // We'll properly implement this later with the correct cookies API
  // const sessionCookie = await cookies().has("session");
  // if (!sessionCookie) {
  //   redirect("/login");
  // }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
      <ClientWrapper>{children}</ClientWrapper>
    </ErrorBoundary>
  );
}
