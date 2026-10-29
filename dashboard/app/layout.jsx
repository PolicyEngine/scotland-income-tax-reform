import { PolicyEngineShell } from "@policyengine/ui-kit/layout";
import "@policyengine/ui-kit/styles.css";
import Script from "next/script";

import "./globals.css";

export const metadata = {
  title: "Reform UK Scotland income tax reform dashboard | PolicyEngine",
  description:
    "Interactive dashboard estimating the fiscal and distributional effects of Reform UK Scotland's income tax proposal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PolicyEngineShell country="uk">{children}</PolicyEngineShell>
        {/* Google Analytics: policyengine.org's GA4 property; this app is served at policyengine.org/uk/scotland-income-tax-reform through a rewrite, where the main site's GA does not reach. */}
        {process.env.NODE_ENV === "production" && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-2YHG89FY0N"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-2YHG89FY0N');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
