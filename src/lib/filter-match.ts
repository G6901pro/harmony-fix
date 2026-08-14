/**
 * Shared, forgiving matching helpers for catalogue filtering.
 *
 * Filter values in the UI ("0–3", "Ride-on Cars") and product data
 * ("0-3 years", "ride on cars") can differ in case, dash style, spacing or
 * trailing units. Everything is normalised to a canonical token before
 * comparing so those variations never cause a mismatch.
 */

/** Lowercase, unify dashes, drop age units and punctuation, collapse spaces. */
export function normalizeToken(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u2010-\u2015\u2212]/g, "-") // en/em dash, minus → hyphen
    .replace(/\b(years|year|yrs|yr|y\/o|months|month|mos)\b/g, " ")
    .replace(/[\s_/]+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/[^a-z0-9+\-& ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Read a field that may be singular or plural, camelCase or snake_case. */
export function readField(product: unknown, keys: string[]): unknown[] {
  if (!product || typeof product !== "object") return [];
  const record = product as Record<string, unknown>;
  const out: unknown[] = [];
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) out.push(...value);
    else out.push(value);
  }
  return out;
}

/** Normalised values of a product attribute (handles arrays + alias keys). */
export function productValues(product: unknown, keys: string[]): string[] {
  return readField(product, keys)
    .map(normalizeToken)
    .filter(Boolean);
}

/**
 * OR logic within a group: keep the product when ANY selected value matches
 * ANY of the product's values for that attribute. An empty selection matches.
 */
export function matchesAny(product: unknown, keys: string[], selected: string[]): boolean {
  if (!selected.length) return true;
  const values = productValues(product, keys);
  if (!values.length) return false;
  const wanted = selected.map(normalizeToken).filter(Boolean);
  return wanted.some((want) => values.some((value) => value === want));
}

export const CATEGORY_KEYS = ["category", "categories", "category_name", "product_category"];
export const AGE_KEYS = ["ageGroup", "age_group", "ageGroups", "age_groups", "age"];
export const BRAND_KEYS = ["brand", "brands", "brand_name"];
export const COLOR_KEYS = ["color", "colors", "colour", "colorOptions"];
