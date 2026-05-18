export function isValidSourceUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return false;
  return /^https?:\/\//i.test(trimmed);
}
