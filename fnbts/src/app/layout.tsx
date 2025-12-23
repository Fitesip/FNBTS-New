import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import {ThemeProvider} from "@/providers/ThemeProvider";
import CollapsibleLayout from "@/components/CollapsibleLayout";

const fnbts = localFont({
  src: [
      {
          path: "../fonts/FNBTS.otf",
          weight: "400",
          style: "normal",
      }
  ],
    display: 'swap',
    variable: '--font-fnbts'
});

export const metadata: Metadata = {
  title: {
      default: 'ФНБТС',
      template: '%s | ФНБТС'
  },
  description: "Добро пожаловать на сервер ФНБТС!",
  metadataBase: new URL('https://fnbts.ru'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
    <head>
        <meta name="yandex-verification" content="6bda32730a792728" />
        <title>ФНБТС</title>
    </head>
      <body
        className={`${fnbts.className} antialiased flex flex-col items-center min-h-screen bg-gradient`}
      >


      {/*<ThemeProvider>*/}
          <div className="">
              <div className="circle red lg:size-110 size-50 lg:top-1/2 top-8/12 lg:left-1/4 left-1/6"></div>
              <div className="circle cyan lg:size-50 size-20 lg:top-1/4 top-5/12 lg:left-1/12 left-1/12"></div>
              <div className="circle purple lg:size-75 size-30 lg:top-1/3 top-1/2 lg:left-3/4 left-7/12"></div>
              <div className="circle pink lg:size-25 size-10 lg:top-1/12 top-2/12 lg:left-1/3 left-4/12"></div>
              <div className="circle yellow lg:size-12 size-4 lg:top-1/4 top-4/12 lg:left-3/5"></div>
          </div>
      <CollapsibleLayout
          triggerElement={
              <div className={`bg-cgray-2 size-3 absolute hidden lg:block left-0 top-0`}></div>
          }
          defaultOpen={true}
          contentClassName={`flex flex-col items-center min-h-screen w-screen`}
      >
        <AuthProvider>
            <Header/>
          {children}
            <Footer/>
        </AuthProvider>
        </CollapsibleLayout>
      {/*</ThemeProvider>*/}
      </body>
    </html>
  );
}
