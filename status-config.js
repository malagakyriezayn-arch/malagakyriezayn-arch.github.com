// Choose ONE way to control the cards. Both pages read this file.

window.STATUS_CONFIG = {
  // OPTION A - Google Sheets (the sheet is your admin panel).
  // Paste the "Publish to web" CSV link here:
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/YOUR-SHEET-ID/pub?output=csv",

  // OPTION B - Firebase (used by admin.html). Ignored when sheetCsvUrl is filled in.
  dbUrl: "https://eurovision-rewind-default-rtdb.asia-southeast1.firebasedatabase.app",
  apiKey: "AIzaSyCM4IK5oxAkZABIRSqov3aLyHivZk0cu6c"
};
