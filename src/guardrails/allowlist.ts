import { parseList } from "../config.js";

export class AllowList {
  private allowedRecipients: Set<string>;
  private allowedDomains: Set<string>;
  private allowedDocumentIds: Set<string>;
  private recipientsEnforced: boolean;
  private docsEnforced: boolean;

  constructor(
    allowedRecipients?: string,
    allowedDomains?: string,
    allowedDocumentIds?: string,
  ) {
    this.allowedRecipients = new Set(
      parseList(allowedRecipients).map((r) => r.toLowerCase()),
    );
    this.allowedDomains = new Set(
      parseList(allowedDomains).map((d) => d.toLowerCase()),
    );
    this.allowedDocumentIds = new Set(parseList(allowedDocumentIds));
    this.recipientsEnforced =
      this.allowedRecipients.size > 0 || this.allowedDomains.size > 0;
    this.docsEnforced = this.allowedDocumentIds.size > 0;
  }

  checkRecipient(email: string): { allowed: boolean; reason?: string } {
    if (!this.recipientsEnforced) return { allowed: true };
    const lower = email.toLowerCase();
    if (this.allowedRecipients.has(lower)) return { allowed: true };
    const domain = lower.split("@")[1];
    if (domain && this.allowedDomains.has(domain)) return { allowed: true };
    return {
      allowed: false,
      reason: `Recipient "${email}" is not on the allow-list. Allowed domains: [${[...this.allowedDomains].join(", ")}]. Allowed addresses: [${[...this.allowedRecipients].join(", ")}].`,
    };
  }

  checkAllRecipients(emails: string[]): { allowed: boolean; reason?: string } {
    for (const email of emails) {
      const result = this.checkRecipient(email);
      if (!result.allowed) return result;
    }
    return { allowed: true };
  }

  checkDocumentId(docId: string): { allowed: boolean; reason?: string } {
    if (!this.docsEnforced) return { allowed: true };
    if (this.allowedDocumentIds.has(docId)) return { allowed: true };
    return {
      allowed: false,
      reason: `Document "${docId}" is not on the allow-list.`,
    };
  }

  isRecipientsEnforced(): boolean {
    return this.recipientsEnforced;
  }

  isDocsEnforced(): boolean {
    return this.docsEnforced;
  }
}
