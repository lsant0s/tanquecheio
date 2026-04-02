import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  // ISR revalidation intervals per the spec
  // Pages define their own revalidate in generateStaticParams / fetch calls
};

export default withNextIntl(nextConfig);