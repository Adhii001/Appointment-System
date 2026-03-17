import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AuthNavActions from "@/components/ui/AuthNavActions";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Doctor Appointment System",
  description: "Front-office appointment management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans antialiased min-h-screen relative overflow-x-hidden bg-cyan-50/30`}>
        <nav className="glass-card sticky top-0 z-50 border-b border-cyan-200/50 animate-fade-in-down">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <a href="/login" className="flex items-center gap-2 text-xl font-bold group">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-sm shadow-md shadow-cyan-200 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  🏥
                </span>
                <span className="bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">
                  MedAppoint
                </span>
              </a>
              <AuthNavActions />
            </div>
          </div>
        </nav>
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
