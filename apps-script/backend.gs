// ─────────────────────────────────────────────────────────────────────────────
//  Empire of Clouds — Google Apps Script backend
//
//  Handles two form types:
//    type=waitlist  → append row to Google Sheet + send confirmation email
//    type=contact   → email message to metekutlu@gmail.com + send auto-reply
//
//  Sheet columns: Date (YYYY-MM-DD HH:MM) | Email | Place (City / Country)
// ─────────────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = "1D9TBArwKCahDCGT9ZftS9cvyxdN3UNnbxMFZhWXTroA";
const SHEET_NAME     = "Waitlist";
const OWNER_EMAIL    = "metekutlu@gmail.com";

// ── Entry point ───────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const type     = (e.parameter.type     || "").trim();
    const email    = (e.parameter.email    || "").trim();
    const timezone = (e.parameter.timezone || "").trim();
    const locale   = (e.parameter.locale   || "").trim();
    const name     = (e.parameter.name     || "").trim();
    const message  = (e.parameter.message  || "").trim();

    if (type === "waitlist") {
      _handleWaitlist(email, timezone, locale);
    } else if (type === "contact") {
      _handleContact(name, email, message, timezone, locale);
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

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet   = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Date", "Email", "Place"]);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold");
  }

  sheet.appendRow([
    _formatDate(new Date()),
    email,
    _formatLocation(timezone, locale),
  ]);

  GmailApp.sendEmail(
    email,
    "Welcome to Empire of Clouds",
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
function _handleContact(name, email, message, timezone, locale) {
  if (!email || !email.includes("@")) throw new Error("Invalid email");

  const place = _formatLocation(timezone, locale);

  GmailApp.sendEmail(
    OWNER_EMAIL,
    "Empire of Clouds — Contact: " + (name || email),
    "From: " + name + " <" + email + ">\n" +
    "Location: " + place + "\n\n" +
    message,
    { name: "Empire of Clouds Contact Form" }
  );

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

// ── Formatting helpers ────────────────────────────────────────────────────────

// "2026-03-22 22:09"
function _formatDate(date) {
  return Utilities.formatDate(date, "UTC", "yyyy-MM-dd HH:mm");
}

// "Europe/Paris" + "fr-FR"  →  "Paris / France"
function _formatLocation(timezone, locale) {
  let city    = "";
  let country = "";

  if (timezone && timezone.includes("/")) {
    // Last segment of tz string, underscores → spaces
    city = timezone.split("/").pop().replace(/_/g, " ");
  }

  if (locale && locale.includes("-")) {
    const code = locale.split("-").pop().toUpperCase();
    country = COUNTRY_CODES[code] || code;
  }

  if (city && country) return city + " / " + country;
  return city || country || "—";
}

// ── Country code → name ───────────────────────────────────────────────────────
const COUNTRY_CODES = {
  AF:"Afghanistan", AL:"Albania", DZ:"Algeria", AO:"Angola", AR:"Argentina",
  AM:"Armenia", AU:"Australia", AT:"Austria", AZ:"Azerbaijan", BH:"Bahrain",
  BD:"Bangladesh", BY:"Belarus", BE:"Belgium", BO:"Bolivia", BA:"Bosnia",
  BR:"Brazil", BG:"Bulgaria", CM:"Cameroon", CA:"Canada", CL:"Chile",
  CN:"China", CO:"Colombia", CR:"Costa Rica", HR:"Croatia", CY:"Cyprus",
  CZ:"Czech Republic", DK:"Denmark", EC:"Ecuador", EG:"Egypt", SV:"El Salvador",
  EE:"Estonia", ET:"Ethiopia", FI:"Finland", FR:"France", GE:"Georgia",
  DE:"Germany", GH:"Ghana", GR:"Greece", GT:"Guatemala", HN:"Honduras",
  HK:"Hong Kong", HU:"Hungary", IN:"India", ID:"Indonesia", IQ:"Iraq",
  IE:"Ireland", IL:"Israel", IT:"Italy", JM:"Jamaica", JP:"Japan",
  JO:"Jordan", KZ:"Kazakhstan", KE:"Kenya", KW:"Kuwait", KG:"Kyrgyzstan",
  LA:"Laos", LV:"Latvia", LB:"Lebanon", LT:"Lithuania", LU:"Luxembourg",
  MK:"North Macedonia", MY:"Malaysia", MV:"Maldives", ML:"Mali",
  MT:"Malta", MX:"Mexico", MD:"Moldova", MN:"Mongolia", ME:"Montenegro",
  MA:"Morocco", MZ:"Mozambique", MM:"Myanmar", NA:"Namibia", NP:"Nepal",
  NL:"Netherlands", NZ:"New Zealand", NI:"Nicaragua", NG:"Nigeria",
  NO:"Norway", OM:"Oman", PK:"Pakistan", PA:"Panama", PY:"Paraguay",
  PE:"Peru", PH:"Philippines", PL:"Poland", PT:"Portugal", QA:"Qatar",
  RO:"Romania", RU:"Russia", SA:"Saudi Arabia", SN:"Senegal", RS:"Serbia",
  SG:"Singapore", SK:"Slovakia", SI:"Slovenia", SO:"Somalia",
  ZA:"South Africa", KR:"South Korea", SS:"South Sudan", ES:"Spain",
  LK:"Sri Lanka", SD:"Sudan", SE:"Sweden", CH:"Switzerland", SY:"Syria",
  TW:"Taiwan", TJ:"Tajikistan", TZ:"Tanzania", TH:"Thailand", TN:"Tunisia",
  TR:"Turkey", TM:"Turkmenistan", UG:"Uganda", UA:"Ukraine",
  AE:"United Arab Emirates", GB:"United Kingdom", US:"United States",
  UY:"Uruguay", UZ:"Uzbekistan", VE:"Venezuela", VN:"Vietnam",
  YE:"Yemen", ZM:"Zambia", ZW:"Zimbabwe"
};

// ── Response helpers ──────────────────────────────────────────────────────────
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
