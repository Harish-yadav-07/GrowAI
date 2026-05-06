import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "GrowAI - AI Career Coach",
  description: "An AI-powered platform that provides personalized career guidance, skill recommendations, and roadmap planning based on user goals and current profile.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider 
    appearance={{
      baseTheme: dark,
    }}
    >

      <html
        lang="en" suppressHydrationWarning
        className={`${inter.className}`}
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {/* Header */}
            <Header />
            <main className="min-h-screen">{children}</main>
            {/* Footer */}
            <footer className="bg-muted/50 py-12">
              <div className="container mx-auto px-4 text-center text-gray-200">
                <p>Made with patience and 💗 by Harish Yadav</p>
              </div>
            </footer>
          </ThemeProvider></body>
      </html>
    </ClerkProvider>
  );
}
