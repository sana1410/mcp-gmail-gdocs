# Google Cloud Setup Guide

This guide walks you through creating the Google Cloud project and OAuth credentials needed for the MCP server.

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a Project** > **New Project**
3. Name it (e.g., "MCP Gmail Docs") and click **Create**
4. Select the new project

## 2. Enable Required APIs

1. Go to **APIs & Services** > **Library**
2. Search for and enable:
   - **Gmail API**
   - **Google Docs API**

## 3. Configure the OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose user type:
   - **Internal** (Google Workspace only — tokens don't expire after 7 days)
   - **External** (personal Gmail — see caveat below)
3. Fill in:
   - App name: "MCP Gmail Docs"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add your Google account as a test user (External type only)
6. Save

## 4. Create OAuth Client Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Desktop app** (for stdio/local use)
4. Name: "MCP Server"
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## 5. Configure the MCP Server

Add to your `.env` file:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

## 6. Authorize

Run:

```bash
npm run auth
```

This opens a browser for Google consent. After approving, tokens are saved locally.

## Important: 7-Day Token Expiry for External Apps

If your OAuth app is set to **External** user type and left in **Testing** status:

- **Refresh tokens expire after ~7 days**
- You'll need to re-authorize periodically

### Options to avoid this:

1. **Use Internal user type** (requires Google Workspace — tokens don't expire)
2. **Publish the app** (moves from Testing to Production — requires Google verification for sensitive scopes like `gmail.send`)
3. **Re-run `npm run auth`** every 7 days (simplest for personal use)

For most personal use cases, option 3 is easiest. For team/production use, pursue option 2.

## Scopes Explained

| Scope | Purpose | Why needed |
|-------|---------|------------|
| `gmail.send` | Send emails only | Least-privilege for email sending (cannot read/delete mail) |
| `documents` | Read/write Google Docs | Required to append to arbitrary existing docs by ID |
| `userinfo.email` | Read user's email address | Used by `auth_status` tool to show connected account |

**Note:** The `documents` scope grants read/write access to all the user's Google Docs. This is broader than ideal, but the `drive.file` scope only works for files the app itself created. A future version may add Google Picker integration for more granular access.
