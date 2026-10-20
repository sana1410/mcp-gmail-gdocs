const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

export function validateEmails(addresses: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const addr of addresses) {
    const cleaned = addr.trim();
    if (isValidEmail(cleaned)) {
      valid.push(cleaned);
    } else {
      invalid.push(cleaned);
    }
  }
  return { valid, invalid };
}

export function validateRecipientCount(
  to: string[],
  cc: string[],
  bcc: string[],
  max: number,
): void {
  const total = to.length + cc.length + bcc.length;
  if (total > max) {
    throw new Error(
      `Too many recipients (${total}). Maximum allowed: ${max}.`,
    );
  }
}

export function validateSize(content: string, maxBytes: number, label: string): void {
  const size = Buffer.byteLength(content, "utf-8");
  if (size > maxBytes) {
    throw new Error(
      `${label} too large (${size} bytes). Maximum: ${maxBytes} bytes.`,
    );
  }
}

export function validateNotEmpty(value: string, label: string): void {
  if (!value.trim()) {
    throw new Error(`${label} cannot be empty.`);
  }
}
