/**
 * Google Apps Script: On Form Submit → POST to Worksheet Webhook
 *
 * Setup:
 * 1. Open your Google Form → 3 dots (top right) → Apps Script
 * 2. Paste this script to Code.gs → set POST_URL below to your webhook URL
 * 3. Save → Current project's Triggers → Add Trigger
 *    - Deployment: Head
 *    - Event: From form - On form submit
 *    - Function: onFormSubmit
 *    - Save and authorize
 *
 * Webhook URL format:
 *   https://YOUR_PORTAL_DOMAIN/api/worksheets/webhook?worksheetId=contact_form_v1
 */

var POST_URL = ''; // e.g. 'https://your-portal.com/api/worksheets/webhook?worksheetId=contact_form_v1'

function onFormSubmit(e) {
  if (!e || !e.response) return;
  var formResponse = e.response;
  var itemResponses = formResponse.getItemResponses();
  var payload = {};

  for (var i = 0; i < itemResponses.length; i++) {
    var item = itemResponses[i].getItem();
    var title = (item.getTitle() || '').trim();
    var response = itemResponses[i];

    if (title === 'Name') {
      payload.name = getResponseText(response);
    } else if (title === 'Email') {
      payload.email = getResponseText(response);
    } else if (title === 'Date of Birth') {
      payload.date_of_birth = getResponseText(response);
    } else if (title === 'Preferred Cities') {
      payload.preferred_cities = getResponseMultiple(response);
    } else if (title === 'Other:' || title === 'Other') {
      payload.other = getResponseText(response);
    } else if (title === 'Current City') {
      payload.current_city = getResponseText(response);
    } else if (title === 'Comments') {
      payload.comments = getResponseText(response);
    } else if (title === '1.' || title === '2.' || title === '3.') {
      var key = 'question_' + title.replace(/[^\d]/g, '');
      payload[key] = getResponseText(response);
    }
  }

  sendToWebhook(payload);
}

function getResponseText(response) {
  try {
    var r = response.getResponse();
    return Array.isArray(r) ? r.join(', ') : (r != null ? String(r) : '');
  } catch (err) {
    return '';
  }
}

function getResponseMultiple(response) {
  try {
    var r = response.getResponse();
    if (Array.isArray(r)) return r;
    if (r != null && r !== '') return [String(r)];
    return [];
  } catch (err) {
    return [];
  }
}

function sendToWebhook(payload) {
  if (!POST_URL.startsWith("https://")) {
    Logger.log('Webhook URL not set. Payload: ' + JSON.stringify(payload));
    return;
  }
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch(POST_URL, options);
  var code = res.getResponseCode();
  var body = res.getContentText();
  if (code < 200 || code >= 300) {
    Logger.log('Webhook error ' + code + ': ' + body);
  }
}
