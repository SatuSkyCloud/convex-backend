import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import "./styles.css";
import { Providers } from "../components/providers";

export const metadata: Metadata = {
  title: "Convex Test 101",
  description: "SatuSky self-hosted Convex CRUD and file-storage test app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexAuthNextjsServerProvider>
          <Providers>{children}</Providers>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
