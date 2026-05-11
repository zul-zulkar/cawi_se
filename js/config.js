const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUp2xUJBnCqy0csDsfcSCYE34vmtyjq6gag7rAUMZbkPp4ypL7FNdtnBtpmrW99RFq_w/exec";
const SHEET_URL_KEY = 'cawi_script_url_override';
function getScriptUrl() {
  return localStorage.getItem(SHEET_URL_KEY) || DEFAULT_SCRIPT_URL;
}
