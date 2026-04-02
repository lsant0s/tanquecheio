import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });
const locales = ["pt", "en"];

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: `${t("appName")} — ${t("tagline")}`,
    description: "Compare fuel prices across Portugal.",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.className} bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale} />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

async function Header({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <a href={`/${locale}/`} className="flex items-center gap-2">
              <span className="text-2xl">⛽</span>
              <span className="font-bold text-lg text-brand-600 dark:text-brand-400">Tanque Cheio</span>
            </a>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <a href={`/${locale}/hoje-em-portugal`} className="text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400">{t("today")}</a>
              <a href={`/${locale}/proxima-semana`} className="text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400">{t("forecast")}</a>
              <a href={`/${locale}/mais-barato`} className="text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400">{t("map")}</a>
            </nav>
          </div>
          <a href={`/${locale === "pt" ? "en" : "pt"}/`} className="text-sm text-gray-500 hover:text-brand-600">
            {locale === "pt" ? "🇬🇧 EN" : "🇵🇹 PT"}
          </a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Tanque Cheio.</p>
          <p className="text-xs text-gray-400">Dados da API Aberta / DGEG</p>
        </div>
      </div>
    </footer>
  );
}