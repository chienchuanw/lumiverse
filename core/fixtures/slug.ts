const COMBINING_MARKS = /[̀-ͯ]/g;

/** Lowercase, ASCII-ish slug: alphanumerics kept, everything else collapsed to "-". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
