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
    const place    = (e.parameter.place    || "").trim();
    const timezone = (e.parameter.timezone || "").trim();
    const lang     = (e.parameter.lang     || "").trim();
    const locale   = (e.parameter.locale   || "").trim();
    const name     = (e.parameter.name     || "").trim();
    const message  = (e.parameter.message  || "").trim();

    if (type === "waitlist") {
      _handleWaitlist(email, place, timezone, lang, locale);
    } else if (type === "contact") {
      _handleContact(name, email, message, place, timezone, locale);
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
function _handleWaitlist(email, place, timezone, lang, locale) {
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
    place || _formatLocation(timezone, locale),
  ]);

  GmailApp.sendEmail(
    email,
    _waitlistEmailSubject(lang),
    _waitlistEmailText(lang),
    {
      name:     "Empire of Clouds",
      htmlBody: _waitlistEmailHtml(lang),
    }
  );
}

// ── Contact ───────────────────────────────────────────────────────────────────
function _handleContact(name, email, message, place, timezone, locale) {
  if (!email || !email.includes("@")) throw new Error("Invalid email");

  if (!place) place = _formatLocation(timezone, locale);

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
    '<tr><td align="center" style="padding:32px 18px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" ' +
    'style="max-width:620px;width:100%;">' +
    '<tr><td style="border:1px solid #151515;background-color:#000000;box-shadow:0 0 0 1px #080808 inset;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    bodyRows +
    '</table></td></tr>' +

    '</table></td></tr></table></body></html>'
  );
}

function _waitlistEmailHtml(lang) {
  var copy = _waitlistEmailCopy(lang);
  var artTop =
    '<span style="color:#6effb0;">✶   ✧    ✦      ✷   ✦     ✶   ✧      ✦   ✷</span>     <span style="color:#ff88cf;">✧   ✦    ✶   ✧</span><br>' +
    '   <span style="color:#ff88cf;">✦      ✶   ✧     ✷   ✦</span>     <span style="color:#6effb0;">✧   ✶      ✦   ✧     ✷   ✦</span><br>' +
    '<span style="color:#6effb0;">✧    ✷      ✦   ✶</span>     <span style="color:#ff88cf;">✧   ✦      ✶   ✧     ✷   ✦</span>      <span style="color:#6effb0;">✧   ✶</span><br>' +
    '   <span style="color:#6effb0;">✶   ✦      ✧   ✷</span>     <span style="color:#ff88cf;">✦   ✧      ✶   ✦     ✷   ✧</span><br>' +
    '<span style="color:#ff88cf;">✦     ✧   ✶      ✷   ✧</span>      <span style="color:#6effb0;">✦   ✶     ✧   ✷      ✦      ✧</span><br>' +
    '   <span style="color:#6effb0;">✧      ✦   ✶     ✧   ✷</span>      <span style="color:#ff88cf;">✦   ✶      ✧   ✦      ✷   ✶</span>';

  var artBottom =
    '<span style="color:#6effb0;">✦    ✧      ✶   ✷</span>     <span style="color:#ff88cf;">✧   ✦      ✶   ✧     ✦   ✷      ✧   ✦</span><br>' +
    '   <span style="color:#ff88cf;">✶      ✧   ✦     ✷   ✧</span>     <span style="color:#6effb0;">✶   ✦      ✧   ✷     ✦   ✶</span><br>' +
    '<span style="color:#6effb0;">✧   ✦      ✷   ✧</span>     <span style="color:#ff88cf;">✶   ✦      ✧   ✶     ✷   ✦</span>      <span style="color:#6effb0;">✧   ✶</span><br>' +
    '   <span style="color:#6effb0;">✦     ✧   ✶      ✷   ✧</span>      <span style="color:#ff88cf;">✦   ✶     ✧   ✷      ✦</span><br>' +
    '<span style="color:#ff88cf;">✶      ✦   ✧     ✷   ✦</span>      <span style="color:#6effb0;">✧   ✶     ✷   ✦      ✧     ✶</span><br>' +
    '   <span style="color:#6effb0;">✧      ✶   ✦     ✧   ✷</span>      <span style="color:#ff88cf;">✦   ✶      ✧   ✦    ✷   ✧   ✦</span>';

  var body =
    '<tr><td style="padding:28px 22px 32px 22px;">' +
    '<div style="font-family:\'Courier New\',Courier,monospace;font-size:14px;line-height:1.55;color:#ffffff;white-space:pre-wrap;text-align:center;">' +
    artTop + '<br><br>' +
    '<span style="display:block;font-size:28px;line-height:1.2;color:#ffffff;">' + copy.brand + '</span><br>' +
    '<span style="color:#ff88cf;">✶ ✧ ✦ ✷ ✦ ✶ ✧ ✦ ✷</span><br><br>' +
    copy.transmissionReceived + '<br><br>' +
    '<span style="color:#ff88cf;">***********************</span><br><br>' +
    copy.enteredSpiral + '<br><br>' +
    '<span style="color:#ff88cf;">:::::::::::::::::::::::</span><br><br>' +
    copy.cloudsLines.join('<br>') + '<br><br>' +
    '<span style="color:#ff88cf;">+++++++++++++++++++++++</span><br><br>' +
    copy.pigmentLines.join('<br>') + '<br><br>' +
    '<span style="color:#ff88cf;">:::::::::::::::::::::::</span><br><br>' +
    copy.updatesLine + '<br><br>' +
    '<span style="color:#ff88cf;">-----------------------</span><br><br>' +
    'Mete Kutlu<br>' +
    copy.role1 + '<br>' +
    copy.role2 + '<br>' +
    copy.role3 + '<br><br>' +
    '<span style="color:#ff88cf;">✦ ✧ ✶ ✷ ✧ ✦ ✶</span><br><br>' +
    copy.brand + '<br>' +
    copy.tagline + '<br>' +
    '<a href="https://www.empireofclouds.com" style="color:#ffffff;text-decoration:none;">www.empireofclouds.com</a><br><br>' +
    artBottom +
    '</div>' +
    '</td></tr>';

  return _emailShell(body);
}

function _waitlistEmailText(lang) {
  var copy = _waitlistEmailCopy(lang);
  return (
    "✶   ✧    ✦      ✷   ✦     ✶   ✧      ✦   ✷     ✧   ✦    ✶   ✧\n" +
    "   ✦      ✶   ✧     ✷   ✦     ✧   ✶      ✦   ✧     ✷   ✦\n" +
    "✧    ✷      ✦   ✶     ✧   ✦      ✶   ✧     ✷   ✦      ✧   ✶\n" +
    "   ✶   ✦      ✧   ✷     ✦   ✧      ✶   ✦     ✷   ✧\n" +
    "✦     ✧   ✶      ✷   ✧      ✦   ✶     ✧   ✷      ✦      ✧\n" +
    "   ✧      ✦   ✶     ✧   ✷      ✦   ✶      ✧   ✦      ✷   ✶\n\n" +
    copy.brand + "\n\n" +
    "✶ ✧ ✦ ✷ ✦ ✶ ✧ ✦ ✷\n\n" +
    copy.transmissionReceived + "\n\n" +
    "***********************\n\n" +
    copy.enteredSpiral + "\n\n" +
    ":::::::::::::::::::::::\n\n" +
    copy.cloudsLines.join("\n") + "\n\n" +
    "+++++++++++++++++++++++\n\n" +
    copy.pigmentLines.join("\n") + "\n\n" +
    ":::::::::::::::::::::::\n\n" +
    copy.updatesLine + "\n\n" +
    "-----------------------\n\n" +
    "Mete Kutlu\n" +
    copy.role1 + "\n" +
    copy.role2 + "\n" +
    copy.role3 + "\n\n" +
    "✦ ✧ ✶ ✷ ✧ ✦ ✶ \n\n" +
    copy.brand + " \n" +
    copy.tagline + "\n" +
    "www.empireofclouds.com\n\n" +
    "✦    ✧      ✶   ✷     ✧   ✦      ✶   ✧     ✦   ✷      ✧   ✦\n" +
    "   ✶      ✧   ✦     ✷   ✧     ✶   ✦      ✧   ✷     ✦   ✶\n" +
    "✧   ✦      ✷   ✧     ✶   ✦      ✧   ✶     ✷   ✦      ✧   ✶\n" +
    "   ✦     ✧   ✶      ✷   ✧      ✦   ✶     ✧   ✷      ✦\n" +
    "✶      ✦   ✧     ✷   ✦      ✧   ✶     ✷   ✦      ✧     ✶\n" +
    "   ✧      ✶   ✦     ✧   ✷      ✦   ✶      ✧   ✦    ✷   ✧   ✦"
  );
}

function _waitlistEmailCopy(lang) {
  if (lang === "fr") {
    return {
      brand: "EMPIRE DES NUAGES",
      tagline: "Codes · Couleurs · Cosmos",
      transmissionReceived: "TRANSMISSION REÇUE",
      enteredSpiral: "Vous êtes entré dans la spirale.",
      cloudsLines: [
        "Les nuages portaient autrefois les dieux,",
        "puis les peintres,",
        "puis les signaux,",
        "puis les données,",
        "et maintenant la vie artificielle."
      ],
      pigmentLines: [
        "Du pigment au pixel,",
        "de la sophia à la donnée,",
        "des constellations aux circuits,",
        "l’atmosphère a toujours été",
        "la matière première de nos rêves."
      ],
      updatesLine: "Vous recevrez prochainement des informations sur la recherche, les publications à venir, et les événements liés au projet.",
      role1: "Creative technologist · artist · architect",
      role2: "Chercheur associé, IPRAUS",
      role3: "Enseignant, ENSA Paris-Belleville"
    };
  }

  if (lang === "tr") {
    return {
      brand: "BULUTLAR İMPARATORLUĞU",
      tagline: "Kodlar · Renkler · Kozmos",
      transmissionReceived: "AKTARIM ALINDI",
      enteredSpiral: "Spiralin içine girdiniz.",
      cloudsLines: [
        "Bulutlar bir zamanlar tanrıları taşıdı,",
        "sonra ressamları,",
        "sonra sinyalleri,",
        "sonra verileri,",
        "ve şimdi yapay yaşamı."
      ],
      pigmentLines: [
        "Pigmentten piksele,",
        "sophia’dan veriye,",
        "takımyıldızlardan devrelere,",
        "atmosfer her zaman",
        "hayallerimizin hammaddesi oldu."
      ],
      updatesLine: "Araştırma, yaklaşan yayınlar ve ilgili etkinlikler hakkında ileride bilgilendirmeler alacaksınız.",
      role1: "Yaratıcı teknolojist · sanatçı · mimar",
      role2: "Araştırmacı, IPRAUS",
      role3: "Öğretim görevlisi, ENSA Paris-Belleville"
    };
  }

  if (lang === "zh") {
    return {
      brand: "云之帝国",
      tagline: "代码 · 色彩 · 宇宙",
      transmissionReceived: "信号已接收",
      enteredSpiral: "你已进入螺旋。",
      cloudsLines: [
        "云曾承载诸神，",
        "随后承载画师，",
        "随后承载信号，",
        "随后承载数据，",
        "而如今承载人工生命。"
      ],
      pigmentLines: [
        "从颜料到像素，",
        "从 sophia 到数据，",
        "从星座到电路，",
        "大气始终是",
        "我们梦想的原始材料。"
      ],
      updatesLine: "今后你将收到有关本研究、即将出版的著作以及相关活动的信息。",
      role1: "讲师，ENSA Paris-Belleville",
      role2: "研究员，IPRAUS",
      role3: "创意技术研究者 · 艺术家 · 建筑师"
    };
  }

  if (lang === "ja") {
    return {
      brand: "雲の帝国",
      tagline: "コード ・ 色彩 ・ 宇宙",
      transmissionReceived: "通信受信",
      enteredSpiral: "あなたは螺旋の中へ入った。",
      cloudsLines: [
        "雲はかつて神々を運び、",
        "次に画家たちを運び、",
        "次に信号を運び、",
        "次にデータを運び、",
        "そして今、人工の生命を運んでいる。"
      ],
      pigmentLines: [
        "顔料からピクセルへ、",
        "sophiaからデータへ、",
        "星座から回路へ、",
        "大気は常に",
        "私たちの夢の原材料であった。"
      ],
      updatesLine: "今後、本研究、今後の出版物、および関連する出来事についての情報が送られます。",
      role1: "講師　ENSA Paris-Belleville",
      role2: "研究員　IPRAUS",
      role3: "クリエイティブ・テクノロジスト ・ 芸術家 ・ 建築家"
    };
  }

  return {
    brand: "EMPIRE OF CLOUDS",
    tagline: "Codes · Colors · Cosmos",
    transmissionReceived: "TRANSMISSION RECEIVED",
    enteredSpiral: "You have entered the spiral.",
    cloudsLines: [
      "Clouds once carried gods,",
      "then painters,",
      "then signals,",
      "then data,",
      "and now artificial life."
    ],
    pigmentLines: [
      "From pigment to pixel,",
      "from sophia to data,",
      "from constellations to circuits,",
      "the atmosphere has always been",
      "the raw material of our dreams."
    ],
    updatesLine: "You will receive future updates about the research, forthcoming publications, and related events.",
    role1: "Creative technologist · artist · architect",
    role2: "Associate researcher, IPRAUS",
    role3: "Lecturer, ENSA Paris-Belleville"
  };
}

function _waitlistEmailSubject(lang) {
  if (lang === "fr") return "Signal reçu — Empire des nuages";
  if (lang === "tr") return "Bir sinyal alındı — Bulutlar İmparatorluğu";
  if (lang === "zh") return "信号已接收 — 云之帝国";
  if (lang === "ja") return "信号を受信 — 雲の帝国";
  return "A signal received — Empire of Clouds";
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
