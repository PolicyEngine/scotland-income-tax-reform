import "./globals.css";

export const metadata = {
  title: "Reform UK Scotland income tax reform dashboard | PolicyEngine",
  description:
    "Interactive dashboard estimating the fiscal and distributional effects of Reform UK Scotland's income tax proposal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
