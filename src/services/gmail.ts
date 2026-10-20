import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { logger } from "../logger.js";

export interface EmailParams {
  to: string[];
  subject: string;
  body: string;
  body_format: "plain" | "html";
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
}

export interface SendResult {
  status: "sent";
  message_id: string;
  thread_id: string;
}

export interface PreviewResult {
  status: "preview";
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  body_format: string;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, "");
}

function buildMimeMessage(from: string, params: EmailParams): string {
  const headers: string[] = [];
  headers.push(`From: ${sanitizeHeader(from)}`);
  headers.push(`To: ${params.to.map(sanitizeHeader).join(", ")}`);
  if (params.cc && params.cc.length > 0) {
    headers.push(`Cc: ${params.cc.map(sanitizeHeader).join(", ")}`);
  }
  if (params.reply_to) {
    headers.push(`Reply-To: ${sanitizeHeader(params.reply_to)}`);
  }
  headers.push(`Subject: =?UTF-8?B?${Buffer.from(params.subject, "utf-8").toString("base64")}?=`);
  headers.push("MIME-Version: 1.0");

  const contentType =
    params.body_format === "html" ? "text/html; charset=UTF-8" : "text/plain; charset=UTF-8";
  headers.push(`Content-Type: ${contentType}`);
  headers.push(`Content-Transfer-Encoding: base64`);

  const bodyBase64 = Buffer.from(params.body, "utf-8").toString("base64");

  return headers.join("\r\n") + "\r\n\r\n" + bodyBase64;
}

export class GmailService {
  private gmail;

  constructor(authClient: OAuth2Client) {
    this.gmail = google.gmail({ version: "v1", auth: authClient });
  }

  async getProfile(): Promise<string> {
    try {
      const profile = await this.gmail.users.getProfile({ userId: "me" });
      return profile.data.emailAddress ?? "(authenticated user)";
    } catch {
      return "(authenticated user)";
    }
  }

  async sendEmail(params: EmailParams): Promise<SendResult> {
    const from = await this.getProfile();
    const raw = buildMimeMessage(from, params);
    const encodedMessage = Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    logger.debug("Sending email via Gmail API");
    const response = await this.gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return {
      status: "sent",
      message_id: response.data.id ?? "",
      thread_id: response.data.threadId ?? "",
    };
  }

  async preview(params: EmailParams): Promise<PreviewResult> {
    const from = await this.getProfile();
    return {
      status: "preview",
      from,
      to: params.to,
      cc: params.cc ?? [],
      bcc: params.bcc ?? [],
      subject: params.subject,
      body: params.body,
      body_format: params.body_format,
    };
  }
}

export { sanitizeHeader, buildMimeMessage };
