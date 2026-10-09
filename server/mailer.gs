/**
 * Brunch Bunch mail server (Google Apps Script web app).
 *
 * Sends the "declined" / "approved" emails to suggestors, and a generic
 * "new suggestion" notice to the admin. It only acts for the signed-in admin:
 * the site sends the admin's Firebase ID token, and this script verifies it,
 * then takes the recipient and restaurant name from the stored suggestion,
 * never from the request. See README.md for deployment steps.
 */

var PROJECT_ID = 'brunch-bunch-9b1af';
var WEB_API_KEY = 'AIzaSyBk-fzWz0OTSCneIXompNReNWH46AGEblM';   // Firebase web API key (public)
var ADMIN_EMAIL = 'jasonjinoh@gmail.com';
var SITE_NAME = 'Brunch Bunch';
var MAX_REASON = 1000;
var NOTIFY_COOLDOWN_SECONDS = 600;

function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e.postData.contents);
    out = handle_(req);
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(req) {
  if (req.action === 'notify') return notifyAdmin_();
  if (req.action === 'decline' || req.action === 'approved') return replyToSuggestor_(req);
  throw new Error('Unknown action');
}

// Public: no user-supplied content, throttled, so it cannot be used to spam or phish.
function notifyAdmin_() {
  var cache = CacheService.getScriptCache();
  if (cache.get('notify')) return { ok: true, throttled: true };
  cache.put('notify', '1', NOTIFY_COOLDOWN_SECONDS);
  GmailApp.sendEmail(ADMIN_EMAIL, SITE_NAME + ': new restaurant suggestion',
    'Someone suggested a restaurant. Open the site, click Admin, and sign in to review it.', { name: SITE_NAME });
  return { ok: true };
}

function replyToSuggestor_(req) {
  var idToken = String(req.idToken || '');
  var id = String(req.suggestionId || '');
  if (!idToken) throw new Error('Not signed in');
  if (!/^[A-Za-z0-9]{1,64}$/.test(id)) throw new Error('Bad suggestion id');
  requireAdmin_(idToken);

  var s = readSuggestion_(id, idToken);
  var subject, message;
  if (req.action === 'decline') {
    var reason = String(req.reason || '').trim();
    if (!reason) throw new Error('A reason is required');
    if (reason.length > MAX_REASON) throw new Error('Reason is too long');
    subject = 'About your suggestion: ' + s.name;
    message = 'Thanks for suggesting ' + s.name + '. We couldn\'t add it: ' + reason;
  } else {
    subject = s.name + ' was added!';
    message = 'Good news! ' + s.name + ' has been added to the site. Thanks for the suggestion!';
  }
  GmailApp.sendEmail(s.email, subject.replace(/[\r\n]+/g, ' '), message, { name: SITE_NAME, replyTo: ADMIN_EMAIL });
  return { ok: true };
}

// Confirms the token is a valid Firebase sign-in for the admin's verified Google account.
function requireAdmin_(idToken) {
  var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(WEB_API_KEY), {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Sign-in could not be verified');
  var users = JSON.parse(res.getContentText()).users || [];
  var u = users[0];
  if (!u || u.emailVerified !== true || String(u.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) throw new Error('Not the admin');
}

// Reads the pending suggestion with the admin's own token (Firestore rules allow only the admin).
function readSuggestion_(id, idToken) {
  var url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents/suggestions/' + id;
  var res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + idToken }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Suggestion not found');
  var f = JSON.parse(res.getContentText()).fields || {};
  var s = { name: str_(f.name), email: str_(f.email), status: str_(f.status) };
  if (s.status !== 'pending') throw new Error('Suggestion is not pending');
  if (!s.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) throw new Error('Suggestion is incomplete');
  return s;
}

function str_(v) { return v && typeof v.stringValue === 'string' ? v.stringValue : ''; }
