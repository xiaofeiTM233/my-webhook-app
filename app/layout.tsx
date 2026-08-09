// app/layout.tsx
import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Webhook App",
  description: "轻量通知中台",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <ConfigProvider locale={zhCN}>
            <AntApp>{children}</AntApp>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
