const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxVyPaTpVmfxBvIPQc2u6kTMKWIZXT7LggpjGVCLV-pGHMRRQzL_zGEr1OjeuArB7OgDA/exec";
const SHEET_URL_KEY = 'cawi_script_url_override';
function getScriptUrl() {
  return localStorage.getItem(SHEET_URL_KEY) || DEFAULT_SCRIPT_URL;
}
