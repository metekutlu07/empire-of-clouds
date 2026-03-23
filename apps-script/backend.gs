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
    "A signal received — Empire of Clouds",
    "EMPIRE OF CLOUDS\n" +
    "Codes · Colors · Cosmos\n" +
    "────────────────────────────────────\n\n" +
    "The clouds have always been computational.\n\n" +
    "You have joined a gathering that traces the deep history of this entanglement —\n" +
    "from Silk Road miniature painters who encoded the cosmos in pigment,\n" +
    "to the algorithms that render the sky in pixels today.\n\n" +
    "Six years · Twenty-five cities · Thirteen countries\n" +
    "Five volumes · Two thousand six hundred pages\n\n" +
    "You will be among the first to receive news of new publications,\n" +
    "exhibitions, and transmissions from the field.\n\n" +
    "────────────────────────────────────\n\n" +
    "— Mete Kutlu\n" +
    "Empire of Clouds: Codes, Colors and Cosmos",
    {
      name:     "Empire of Clouds",
      htmlBody: _waitlistEmailHtml(),
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
    "EMPIRE OF CLOUDS\n" +
    "Codes · Colors · Cosmos\n" +
    "────────────────────────────────────\n\n" +
    "Hello " + (name || "") + ",\n\n" +
    "Your message has been received. We will be in touch soon.\n\n" +
    "────────────────────────────────────\n\n" +
    "— Mete Kutlu\n" +
    "Empire of Clouds: Codes, Colors and Cosmos",
    {
      name:     "Empire of Clouds",
      htmlBody: _contactReplyHtml(name),
    }
  );
}

// ── Email HTML builders ───────────────────────────────────────────────────────

function _emailShell(bodyRows) {
  return (
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background-color:#000000;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
    'style="background-color:#000000;">' +
    '<tr><td align="center" style="padding:56px 24px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" ' +
    'style="max-width:560px;width:100%;">' +

    // ── Header ──
    '<tr><td style="padding-bottom:36px;border-bottom:1px solid #1e1e1e;">' +
    '<p style="margin:0;font-family:\'Courier New\',Courier,monospace;font-size:11px;' +
    'letter-spacing:3px;color:#777777;text-transform:uppercase;">Empire of Clouds</p>' +
    '<p style="margin:6px 0 0 0;font-family:\'Courier New\',Courier,monospace;font-size:9px;' +
    'letter-spacing:2px;color:#444444;text-transform:uppercase;">Codes &nbsp;·&nbsp; Colors &nbsp;·&nbsp; Cosmos</p>' +
    '</td></tr>' +

    // ── Body rows passed in ──
    bodyRows +

    // ── Divider ──
    '<tr><td style="border-top:1px solid #1e1e1e;padding-bottom:28px;"></td></tr>' +

    // ── Signature ──
    '<tr><td>' +
    '<p style="margin:0;font-family:\'Courier New\',Courier,monospace;font-size:13px;color:#dddddd;">' +
    '&#8212; Mete Kutlu</p>' +
    '<p style="margin:6px 0 0 0;font-family:\'Courier New\',Courier,monospace;font-size:9px;' +
    'letter-spacing:1px;color:#444444;text-transform:uppercase;">Empire of Clouds</p>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>'
  );
}

function _waitlistEmailHtml() {
  var body =
    '<tr><td style="padding:48px 0 44px 0;">' +

    '<p style="margin:0 0 28px 0;font-family:Georgia,\'Times New Roman\',serif;' +
    'font-size:22px;line-height:1.5;color:#f0f0f0;font-style:italic;font-weight:normal;">' +
    'The clouds have always been computational.</p>' +

    '<p style="margin:0 0 22px 0;font-family:Georgia,\'Times New Roman\',serif;' +
    'font-size:15px;line-height:1.9;color:#bbbbbb;">' +
    'You have joined a gathering that traces the deep history of this entanglement ' +
    '&#8212; from Silk Road miniature painters who encoded the cosmos in pigment, ' +
    'to the algorithms that render the sky in pixels today.</p>' +

    '<p style="margin:0 0 24px 0;font-family:\'Courier New\',Courier,monospace;' +
    'font-size:11px;line-height:2.4;color:#555555;">' +
    'Six years &nbsp;·&nbsp; Twenty-five cities &nbsp;·&nbsp; Thirteen countries<br>' +
    'Five volumes &nbsp;·&nbsp; Two thousand six hundred pages</p>' +

    '<p style="margin:0;font-family:Georgia,\'Times New Roman\',serif;' +
    'font-size:15px;line-height:1.9;color:#bbbbbb;">' +
    'You will be among the first to receive news of new publications, ' +
    'exhibitions, and transmissions from the field.</p>' +

    '</td></tr>';

  return _emailShell(body);
}

function _contactReplyHtml(name) {
  var greeting = name ? ('Hello ' + name + ',') : 'Hello,';

  var body =
    '<tr><td style="padding:48px 0 44px 0;">' +

    '<p style="margin:0 0 22px 0;font-family:Georgia,\'Times New Roman\',serif;' +
    'font-size:15px;line-height:1.9;color:#bbbbbb;">' + greeting + '</p>' +

    '<p style="margin:0;font-family:Georgia,\'Times New Roman\',serif;' +
    'font-size:15px;line-height:1.9;color:#bbbbbb;">' +
    'Your message has been received. We will be in touch soon.</p>' +

    '</td></tr>';

  return _emailShell(body);
}

// ── Formatting helpers ────────────────────────────────────────────────────────

// "2026-03-22 22:09"
function _formatDate(date) {
  return Utilities.formatDate(date, "UTC", "yyyy-MM-dd HH:mm");
}

// "Europe/Paris"  →  "Paris / France"
// City comes from the timezone string; country from the TZ_COUNTRY lookup.
// Locale is only a fallback when the timezone isn't in the table.
function _formatLocation(timezone, locale) {
  let city    = "";
  let country = "";

  if (timezone && timezone.includes("/")) {
    city    = timezone.split("/").pop().replace(/_/g, " ");
    country = TZ_COUNTRY[timezone] || "";
  }

  // Fallback: derive country from browser locale (e.g. "en-GB" → "United Kingdom")
  if (!country && locale && locale.includes("-")) {
    const code = locale.split("-").pop().toUpperCase();
    country = COUNTRY_CODES[code] || code;
  }

  if (city && country) return city + " / " + country;
  return city || country || "—";
}

// ── Timezone → Country ────────────────────────────────────────────────────────
const TZ_COUNTRY = {
  // Europe
  "Europe/Paris":"France","Europe/London":"United Kingdom","Europe/Berlin":"Germany",
  "Europe/Madrid":"Spain","Europe/Rome":"Italy","Europe/Amsterdam":"Netherlands",
  "Europe/Brussels":"Belgium","Europe/Vienna":"Austria","Europe/Zurich":"Switzerland",
  "Europe/Stockholm":"Sweden","Europe/Oslo":"Norway","Europe/Copenhagen":"Denmark",
  "Europe/Helsinki":"Finland","Europe/Warsaw":"Poland","Europe/Prague":"Czech Republic",
  "Europe/Budapest":"Hungary","Europe/Bucharest":"Romania","Europe/Sofia":"Bulgaria",
  "Europe/Athens":"Greece","Europe/Istanbul":"Turkey","Europe/Moscow":"Russia",
  "Europe/Kiev":"Ukraine","Europe/Kyiv":"Ukraine","Europe/Minsk":"Belarus",
  "Europe/Lisbon":"Portugal","Europe/Dublin":"Ireland","Europe/Riga":"Latvia",
  "Europe/Tallinn":"Estonia","Europe/Vilnius":"Lithuania","Europe/Belgrade":"Serbia",
  "Europe/Zagreb":"Croatia","Europe/Sarajevo":"Bosnia","Europe/Skopje":"North Macedonia",
  "Europe/Ljubljana":"Slovenia","Europe/Bratislava":"Slovakia",
  "Europe/Luxembourg":"Luxembourg","Europe/Nicosia":"Cyprus","Europe/Valletta":"Malta",
  "Europe/Tirane":"Albania","Europe/Podgorica":"Montenegro","Europe/Chisinau":"Moldova",
  "Europe/Kaliningrad":"Russia","Europe/Samara":"Russia","Europe/Ulyanovsk":"Russia",
  "Europe/Volgograd":"Russia","Europe/Astrakhan":"Russia","Europe/Saratov":"Russia",
  // Americas
  "America/New_York":"United States","America/Chicago":"United States",
  "America/Denver":"United States","America/Los_Angeles":"United States",
  "America/Phoenix":"United States","America/Anchorage":"United States",
  "America/Honolulu":"United States","America/Detroit":"United States",
  "America/Indiana/Indianapolis":"United States","America/Kentucky/Louisville":"United States",
  "America/Toronto":"Canada","America/Vancouver":"Canada","America/Montreal":"Canada",
  "America/Calgary":"Canada","America/Winnipeg":"Canada","America/Halifax":"Canada",
  "America/St_Johns":"Canada","America/Edmonton":"Canada",
  "America/Mexico_City":"Mexico","America/Monterrey":"Mexico","America/Tijuana":"Mexico",
  "America/Sao_Paulo":"Brazil","America/Manaus":"Brazil","America/Belem":"Brazil",
  "America/Buenos_Aires":"Argentina","America/Argentina/Buenos_Aires":"Argentina",
  "America/Bogota":"Colombia","America/Lima":"Peru","America/Santiago":"Chile",
  "America/Caracas":"Venezuela","America/Montevideo":"Uruguay",
  "America/La_Paz":"Bolivia","America/Asuncion":"Paraguay","America/Guayaquil":"Ecuador",
  "America/Panama":"Panama","America/Costa_Rica":"Costa Rica","America/Guatemala":"Guatemala",
  "America/Havana":"Cuba","America/Santo_Domingo":"Dominican Republic",
  "America/Port-au-Prince":"Haiti","America/Jamaica":"Jamaica",
  "America/Tegucigalpa":"Honduras","America/Managua":"Nicaragua","America/El_Salvador":"El Salvador",
  "America/Barbados":"Barbados","America/Trinidad":"Trinidad and Tobago",
  // Asia
  "Asia/Tokyo":"Japan","Asia/Shanghai":"China","Asia/Beijing":"China",
  "Asia/Hong_Kong":"Hong Kong","Asia/Macau":"Macau","Asia/Singapore":"Singapore",
  "Asia/Seoul":"South Korea","Asia/Taipei":"Taiwan","Asia/Bangkok":"Thailand",
  "Asia/Jakarta":"Indonesia","Asia/Makassar":"Indonesia","Asia/Jayapura":"Indonesia",
  "Asia/Kolkata":"India","Asia/Calcutta":"India","Asia/Mumbai":"India",
  "Asia/Karachi":"Pakistan","Asia/Lahore":"Pakistan","Asia/Dhaka":"Bangladesh",
  "Asia/Colombo":"Sri Lanka","Asia/Kathmandu":"Nepal","Asia/Kabul":"Afghanistan",
  "Asia/Tehran":"Iran","Asia/Baghdad":"Iraq","Asia/Riyadh":"Saudi Arabia",
  "Asia/Jeddah":"Saudi Arabia","Asia/Dubai":"United Arab Emirates",
  "Asia/Abu_Dhabi":"United Arab Emirates","Asia/Kuwait":"Kuwait",
  "Asia/Qatar":"Qatar","Asia/Bahrain":"Bahrain","Asia/Muscat":"Oman",
  "Asia/Beirut":"Lebanon","Asia/Damascus":"Syria","Asia/Amman":"Jordan",
  "Asia/Jerusalem":"Israel","Asia/Tel_Aviv":"Israel",
  "Asia/Tbilisi":"Georgia","Asia/Yerevan":"Armenia","Asia/Baku":"Azerbaijan",
  "Asia/Almaty":"Kazakhstan","Asia/Tashkent":"Uzbekistan","Asia/Ashgabat":"Turkmenistan",
  "Asia/Dushanbe":"Tajikistan","Asia/Bishkek":"Kyrgyzstan","Asia/Ulaanbaatar":"Mongolia",
  "Asia/Yangon":"Myanmar","Asia/Phnom_Penh":"Cambodia","Asia/Vientiane":"Laos",
  "Asia/Ho_Chi_Minh":"Vietnam","Asia/Hanoi":"Vietnam","Asia/Saigon":"Vietnam",
  "Asia/Kuala_Lumpur":"Malaysia","Asia/Manila":"Philippines",
  "Asia/Pyongyang":"North Korea","Asia/Colombo":"Sri Lanka",
  "Asia/Nicosia":"Cyprus","Asia/Aden":"Yemen","Asia/Sanaa":"Yemen",
  // Africa
  "Africa/Cairo":"Egypt","Africa/Lagos":"Nigeria","Africa/Nairobi":"Kenya",
  "Africa/Johannesburg":"South Africa","Africa/Casablanca":"Morocco",
  "Africa/Tunis":"Tunisia","Africa/Algiers":"Algeria","Africa/Accra":"Ghana",
  "Africa/Addis_Ababa":"Ethiopia","Africa/Khartoum":"Sudan",
  "Africa/Dar_es_Salaam":"Tanzania","Africa/Kampala":"Uganda",
  "Africa/Lusaka":"Zambia","Africa/Harare":"Zimbabwe","Africa/Abidjan":"Ivory Coast",
  "Africa/Dakar":"Senegal","Africa/Maputo":"Mozambique","Africa/Luanda":"Angola",
  "Africa/Libreville":"Gabon","Africa/Kinshasa":"DR Congo","Africa/Tripoli":"Libya",
  // Oceania
  "Australia/Sydney":"Australia","Australia/Melbourne":"Australia",
  "Australia/Brisbane":"Australia","Australia/Perth":"Australia",
  "Australia/Adelaide":"Australia","Australia/Darwin":"Australia",
  "Australia/Hobart":"Australia","Pacific/Auckland":"New Zealand",
  "Pacific/Fiji":"Fiji","Pacific/Honolulu":"United States",
  "Pacific/Guam":"Guam","Pacific/Port_Moresby":"Papua New Guinea",
  // Atlantic / Other
  "Atlantic/Reykjavik":"Iceland","Atlantic/Azores":"Portugal",
  "Atlantic/Canary":"Spain","Atlantic/Madeira":"Portugal",
  "Indian/Mauritius":"Mauritius","Indian/Maldives":"Maldives",
};

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
