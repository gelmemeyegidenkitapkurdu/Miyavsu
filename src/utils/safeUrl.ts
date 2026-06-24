const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

export const sanitizeExternalUrl = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasExplicitScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
  const normalized = hasExplicitScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(normalized);
    if (!HTTP_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

export const sanitizeMailtoUrl = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/[\r\n]/.test(trimmed)) return null;

  const normalizedEmail = trimmed.replace(/^mailto:/i, '').trim();
  if (!normalizedEmail) return null;

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  if (!emailRegex.test(normalizedEmail)) return null;

  return `mailto:${normalizedEmail}`;
};
