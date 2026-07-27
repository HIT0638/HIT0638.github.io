import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lero β — Personal Site",
  description:
    "Lero β 的个人网站：在产品、数据与表达之间，持续做一些实验。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
