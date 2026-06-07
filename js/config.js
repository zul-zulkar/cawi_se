const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxX8J4X2yzUTzPADGTX6yDoMaO3pumbBEJYesnRONygaNDUlYTDy3k_pCDBzBXARCCyfw/exec";
const SHEET_URL_KEY = 'cawi_script_url_override';
function getScriptUrl() {
  return localStorage.getItem(SHEET_URL_KEY) || DEFAULT_SCRIPT_URL;
}
