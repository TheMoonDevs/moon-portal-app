/**
 * Generates Google Apps Script (.gs) files for worksheet index.ts files
 * that contains googleForm metadata.
 * Run from portal: npm run generate:gs
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const WORKSHEETS_DIR = path.join(__dirname, "../lib/worksheets");
const LEGACY_OUT_DIR = path.join(__dirname, "../lib/worksheets/GoogleAppsScript");

function extractWorksheetMeta(content: string): { id: string; slug: string } | null {
  const idMatch = content.match(/id:\s*["']([^"']+)["']/);
  const slugMatch = content.match(/slug:\s*["']([^"']+)["']/);
  if (!idMatch) return null;
  return {
    id: idMatch[1],
    slug: slugMatch ? slugMatch[1] : idMatch[1],
  };
}

function shouldGenerateGoogleFormScript(content: string): boolean {
  // Explicit worksheet-level marker (preferred).
  if (/googleFormSheet\s*:\s*true/.test(content)) return true;
  // Backward-compatible detection for field-level builder usage.
  if (/\.googleForm\s*\(/.test(content)) return true;
  // Legacy object-literal style.
  if (/googleForm\s*:\s*\{/.test(content)) return true;
  return false;
}

function escapeGsString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function generateGsContent(slug: string, postUrl: string, apiKey: string): string {
  const webhookPath = `/api/worksheets/webhook`;
  const fullUrl = postUrl.replace(/\/?$/, "") + webhookPath;

  return [
    "/**",
    " * Google Apps Script: On Form Submit -> POST to Portal Worksheet Webhook",
    ` * Worksheet slug: ${slug}`,
    " * Generated file. Run: npm run generate:gs",
    " */",
    "",
    "function onFormSubmit(e) {",
    "  if (!e || !e.response) return;",
    `  var webhookUrl = '${escapeGsString(fullUrl)}';`,
    `  var worksheetSlug = '${escapeGsString(slug)}';`,
    `  var apiKey = '${escapeGsString(apiKey)}';`,
    "",
    "  var formResponse = e.response;",
    "  var itemResponses = formResponse.getItemResponses();",
    "  var answers = {};",
    "",
    "  for (var i = 0; i < itemResponses.length; i++) {",
    "    var item = itemResponses[i].getItem();",
    "    var title = (item.getTitle() || '').trim();",
    "    var response = itemResponses[i].getResponse();",
    "    if (Array.isArray(response)) {",
    "      answers[title] = response;",
    "    } else if (response != null) {",
    "      answers[title] = String(response);",
    "    } else {",
    "      answers[title] = '';",
    "    }",
    "  }",
    "",
    "  var payload = { worksheetSlug: worksheetSlug, answers: answers };",
    "  postJson_(webhookUrl, apiKey, payload);",
    "}",
    "",
    "function postJson_(url, apiKey, payload) {",
    "  if (!url || url.indexOf('http') !== 0) {",
    "    Logger.log('Webhook URL not set. Payload: ' + JSON.stringify(payload));",
    "    return;",
    "  }",
    "  var options = {",
    "    method: 'post',",
    "    contentType: 'application/json',",
    "    headers: { 'tmd_portal_api_key': apiKey },",
    "    payload: JSON.stringify(payload),",
    "    muteHttpExceptions: true",
    "  };",
    "  var res = UrlFetchApp.fetch(url, options);",
    "  var code = res.getResponseCode();",
    "  var body = res.getContentText();",
    "  if (code < 200 || code >= 300) {",
    "    Logger.log('Webhook error ' + code + ': ' + body);",
    "  }",
    "}",
    "",
  ].join("\n");
}

function main() {
  const postUrl = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim();
  const apiKey = process.env.NEXT_PUBLIC_TMD_PORTAL_API_KEY?.trim();
  if (!postUrl || !apiKey) {
    console.error(
      "Error: NEXT_PUBLIC_APP_BASE_URL and NEXT_PUBLIC_TMD_PORTAL_API_KEY must be set in .env"
    );
    process.exit(1);
  }

  const reservedDirs = new Set(["core", "global", "registry", "GoogleAppsScript"]);
  const worksheets = fs
    .readdirSync(WORKSHEETS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !reservedDirs.has(d.name))
    .map((d) => ({
      worksheetDir: path.join(WORKSHEETS_DIR, d.name),
      entryFilePath: path.join(WORKSHEETS_DIR, d.name, "index.ts"),
    }))
    .filter((p) => fs.existsSync(p.entryFilePath));

  if (fs.existsSync(LEGACY_OUT_DIR)) {
    for (const file of fs.readdirSync(LEGACY_OUT_DIR)) {
      if (file.endsWith(".gs")) {
        fs.unlinkSync(path.join(LEGACY_OUT_DIR, file));
      }
    }
  }
  let generated = 0;

  for (const worksheet of worksheets) {
    const content = fs.readFileSync(worksheet.entryFilePath, "utf-8");
    if (!shouldGenerateGoogleFormScript(content)) continue;

    const meta = extractWorksheetMeta(content);
    if (!meta) continue;

    const gsContent = generateGsContent(meta.slug, postUrl, apiKey);
    const outPath = path.join(
      worksheet.worksheetDir,
      `GoogleAppsScript-${meta.slug}.gs`,
    );
    fs.writeFileSync(outPath, gsContent, "utf-8");
    console.log("Wrote:", outPath);
    generated++;
  }

  console.log("Generated", generated, "script(s).");
}

main();

