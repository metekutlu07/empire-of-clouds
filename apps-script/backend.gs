// ─────────────────────────────────────────────────────────────────────────────
//  Empire of Clouds — Google Apps Script backend
//
//  Handles two form types:
//    type=waitlist  → append row to Google Sheet + send confirmation email
//    type=contact   → email message to metekutlu@gmail.com + send auto-reply
//
//  SETUP:
//  1. Create a new Google Spreadsheet. Copy the ID from its URL:
//       https://docs.google.com/spreadsheets/d/  ← THIS PART →  /edit
//  2. Paste it into SPREADSHEET_ID below.
//  3. Open Extensions > Apps Script and paste this whole file.
//  4. Click Deploy > New deployment > Web app.
//       Execute as: Me
//       Who has access: Anyone
//  5. Authorise the permissions (Gmail + Sheets).
//  6. Copy the deployment URL and paste it into js/waitlist.js as ENDPOINT.
// ─────────────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = "PASTE_YOUR_SPREADSHEET_ID_HERE";
const SHEET_NAME     = "Waitlist";
const OWNER_EMAIL    = "metekutlu@gmail.com";

// ── Entry point ───────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const type     = (e.parameter.type     || "").trim();
    const email    = (e.parameter.email    || "").trim();
    const timezone = (e.parameter.timezone || "—").trim();
    const locale   = (e.parameter.locale   || "—").trim();
    const name     = (e.parameter.name     || "").trim();
    const message  = (e.parameter.message  || "").trim();

    if (type === "waitlist") {
      _handleWaitlist(email, timezone, locale);
    } else if (type === "contact") {
      _handleContact(name, email, message, timezone);
    }

    return _ok();
  } catch (err) {
    return _err(err.toString());
  }
}

function doGet() {
  return ContentService.createTextOutput("Empire of Clouds endpoint active.");
}

// ── Waitlist ──────────────────────────────────────────────────────────────────
function _handleWaitlist(email, timezone, locale) {
  if (!email || !email.includes("@")) throw new Error("Invalid email");

  // 1. Append to Google Sheet
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet   = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Timestamp (UTC)", "Email", "Timezone", "Locale"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
  }

  sheet.appendRow([
    new Date().toISOString(),
    email,
    timezone,
    locale,
  ]);

  // 2. Send confirmation email to subscriber
  GmailApp.sendEmail(
    email,
    "Welcome to Empire of Clouds",
    // plain-text fallback
    "Thank you for joining the Empire of Clouds waitlist.\n\n" +
    "You will be among the first to hear about new publications and events.\n\n" +
    "— Mete Kutlu\nEmpire of Clouds",
    {
      name:     "Empire of Clouds",
      htmlBody:
        "<p style='font-family:sans-serif'>Thank you for joining the <strong>Empire of Clouds</strong> waitlist.</p>" +
        "<p style='font-family:sans-serif'>You will be among the first to hear about new publications and events along the Silk Road.</p>" +
        "<br><p style='font-family:sans-serif'>— Mete Kutlu<br><em>Empire of Clouds</em></p>",
    }
  );
}

// ── Contact ───────────────────────────────────────────────────────────────────
function _handleContact(name, email, message, timezone) {
  if (!email || !email.includes("@")) throw new Error("Invalid email");

  // 1. Forward message to owner
  GmailApp.sendEmail(
    OWNER_EMAIL,
    "Empire of Clouds — Contact: " + (name || email),
    "From: " + name + " <" + email + ">\n" +
    "Timezone: " + timezone + "\n\n" +
    message,
    { name: "Empire of Clouds Contact Form" }
  );

  // 2. Auto-reply to sender
  GmailApp.sendEmail(
    email,
    "Message received — Empire of Clouds",
    "Hello " + (name || "") + ",\n\n" +
    "Your message has been received. We will be in touch soon.\n\n" +
    "— Mete Kutlu\nEmpire of Clouds",
    {
      name:     "Empire of Clouds",
      htmlBody:
        "<p style='font-family:sans-serif'>Hello " + (name || "") + ",</p>" +
        "<p style='font-family:sans-serif'>Your message has been received. We will be in touch soon.</p>" +
        "<br><p style='font-family:sans-serif'>— Mete Kutlu<br><em>Empire of Clouds</em></p>",
    }
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _ok() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function _err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "error", message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
