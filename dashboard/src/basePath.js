export const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH === ""
    ? ""
    : process.env.NEXT_PUBLIC_BASE_PATH || "/uk/scotland-income-tax-reform";

export function withBasePath(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalizedPath}`;
}
