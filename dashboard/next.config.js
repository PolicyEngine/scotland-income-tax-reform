/** @type {import('next').NextConfig} */
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH === ""
    ? undefined
    : process.env.NEXT_PUBLIC_BASE_PATH || "/uk/scotland-income-tax-reform";

const nextConfig = {
  ...(basePath ? { basePath } : {}),
  reactStrictMode: true,
};

module.exports = nextConfig;
