// The QR given to the buyer encodes the pickup code with a prefix, so scanning it with any phone camera
// shows something readable and our scanner can tell it apart from unrelated QR codes.
const PREFIX = 'buenbocado:';

export function encodePickupCode(code: string): string {
  return `${PREFIX}${code}`;
}

/** Returns the pickup code (e.g. "#A1B2") from a scanned QR text or a typed code. Null if it does not look like one. */
export function parsePickupCode(raw: string): string | null {
  const text = raw.trim();
  const body = text.toLowerCase().startsWith(PREFIX) ? text.slice(PREFIX.length) : text;
  const clean = body.trim().toUpperCase().replace(/^#/, '');
  return /^[A-Z0-9]{4}$/.test(clean) ? `#${clean}` : null;
}
