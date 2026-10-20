import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { logger } from "../logger.js";

export interface AppendParams {
  document_id: string;
  text: string;
  add_heading?: string;
  add_timestamp?: boolean;
  separator?: "none" | "blank_line" | "horizontal_rule";
}

export interface AppendResult {
  status: "appended";
  document_id: string;
  characters_added: number;
  document_url: string;
}

export interface AppendPreviewResult {
  status: "preview";
  document_id: string;
  text_to_append: string;
  document_url: string;
}

export function extractDocumentId(input: string): string {
  const urlPatterns = [
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{20,})$/,
  ];
  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }
  throw new Error(
    `Invalid document ID or URL: "${input}". Provide a Google Docs URL or a raw document ID.`,
  );
}

function buildAppendText(params: AppendParams): string {
  const parts: string[] = [];

  if (params.separator === "horizontal_rule") {
    parts.push("\n───────────────────────────────\n");
  } else if (params.separator !== "none") {
    parts.push("\n");
  }

  if (params.add_timestamp) {
    parts.push(`[${new Date().toISOString()}]\n`);
  }

  if (params.add_heading) {
    parts.push(`${params.add_heading}\n`);
  }

  parts.push(params.text);
  parts.push("\n");

  return parts.join("");
}

export class DocsService {
  private docs;

  constructor(authClient: OAuth2Client) {
    this.docs = google.docs({ version: "v1", auth: authClient });
  }

  async appendText(params: AppendParams): Promise<AppendResult> {
    const docId = extractDocumentId(params.document_id);
    const textToAppend = buildAppendText(params);

    logger.debug("Appending to document", { docId, length: textToAppend.length });

    await this.docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [
          {
            insertText: {
              text: textToAppend,
              endOfSegmentLocation: { segmentId: "" },
            },
          },
        ],
      },
    });

    return {
      status: "appended",
      document_id: docId,
      characters_added: textToAppend.length,
      document_url: `https://docs.google.com/document/d/${docId}/edit`,
    };
  }

  async preview(params: AppendParams): Promise<AppendPreviewResult> {
    const docId = extractDocumentId(params.document_id);
    const textToAppend = buildAppendText(params);

    return {
      status: "preview",
      document_id: docId,
      text_to_append: textToAppend,
      document_url: `https://docs.google.com/document/d/${docId}/edit`,
    };
  }
}

export { buildAppendText };
