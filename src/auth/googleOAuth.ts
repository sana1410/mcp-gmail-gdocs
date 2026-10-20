import { google } from "googleapis";
import { TokenStore, type StoredTokens } from "./tokenStore.js";
import { logger } from "../logger.js";
import type { Config } from "../config.js";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/documents",
];

export class GoogleAuthProvider {
  private oauth2Client;
  private tokenStore: TokenStore;

  constructor(private config: Config) {
    this.oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI,
    );
    this.tokenStore = new TokenStore(config.TOKEN_STORE_PATH);

    this.oauth2Client.on("tokens", (tokens) => {
      const existing = this.tokenStore.load();
      const merged: StoredTokens = {
        access_token: tokens.access_token ?? existing?.access_token ?? "",
        refresh_token: tokens.refresh_token ?? existing?.refresh_token,
        expiry_date: tokens.expiry_date ?? existing?.expiry_date,
        scope: tokens.scope ?? existing?.scope,
        token_type: tokens.token_type ?? existing?.token_type,
      };
      this.tokenStore.save(merged);
      logger.debug("Tokens refreshed and saved");
    });

    const stored = this.tokenStore.load();
    if (stored) {
      this.oauth2Client.setCredentials(stored);
    }
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });
  }

  async handleCallback(code: string): Promise<StoredTokens> {
    const { tokens } = await this.oauth2Client.getToken(code);
    const stored: StoredTokens = {
      access_token: tokens.access_token ?? "",
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      scope: tokens.scope ?? undefined,
      token_type: tokens.token_type ?? undefined,
    };
    this.oauth2Client.setCredentials(tokens);
    this.tokenStore.save(stored);
    return stored;
  }

  getClient() {
    return this.oauth2Client;
  }

  isAuthenticated(): boolean {
    const tokens = this.tokenStore.load();
    return !!(tokens?.access_token || tokens?.refresh_token);
  }

  async getAuthStatus(): Promise<{
    authenticated: boolean;
    email?: string;
    scopes?: string[];
    expires_at?: string;
  }> {
    if (!this.isAuthenticated()) {
      return { authenticated: false };
    }
    try {
      const tokens = this.tokenStore.load();
      if (tokens) {
        this.oauth2Client.setCredentials(tokens);
      }
      const tokenInfo = await this.oauth2Client.getAccessToken();
      if (!tokenInfo.token) {
        return { authenticated: false };
      }
      let email: string | undefined;
      try {
        const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
        const profile = await gmail.users.getProfile({ userId: "me" });
        email = profile.data.emailAddress ?? undefined;
      } catch {
        // gmail.send scope may not allow getProfile in all cases
      }
      return {
        authenticated: true,
        email,
        scopes: tokens?.scope?.split(" "),
        expires_at: tokens?.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : undefined,
      };
    } catch (err) {
      logger.warn("Auth status check failed", { error: String(err) });
      return { authenticated: false };
    }
  }

  getScopes(): string[] {
    return SCOPES;
  }
}
