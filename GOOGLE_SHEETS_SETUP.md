# 🌸 100% Lifetime Free Guestbook via Google Sheets

This solution is **100% free forever**:
- ✅ **Hosted on your personal Google Drive** — will NEVER expire, pause, or charge.
- ✅ **No credit card or paid account** needed ever.
- ✅ **Live sync** — anyone visiting your site worldwide can sign, and all messages appear for everyone.
- ✅ **Easy to manage** — you can see, edit, or delete any message directly in your Google Sheet on your phone or laptop!

---

## 2-Minute Setup Instructions

### Step 1: Create a New Google Sheet
1. Open [Google Sheets](https://sheets.new) in your browser.
2. Name the sheet: **`Webiee Guestbook`**.
3. In the first row (**Row 1**), write these 5 column headers:
   - Column A: **`id`**
   - Column B: **`name`**
   - Column C: **`message`**
   - Column D: **`date`**
   - Column E: **`likes`**
4. In **Row 2**, add an initial cute welcome message:
   - A2: `1`
   - B2: `Tester ✨`
   - C2: `Welcome to the live shrine guestbook! Anyone can sign here! ♡`
   - D2: `Oct 23, 2026, 03:00 PM`
   - E2: `1`

---

### Step 2: Open Apps Script
1. In the top menu of your Google Sheet, click:
   **Extensions** → **Apps Script**
2. Delete any code currently in the editor and replace it with this complete script:

```javascript
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  var entries = [];

  // Read rows in reverse order so latest messages appear first
  for (var i = rows.length - 1; i >= 1; i--) {
    var r = rows[i];
    if (r[1] || r[2]) {
      entries.push({
        id: String(r[0] || i),
        name: String(r[1] || 'Anonymous'),
        message: String(r[2] || ''),
        date: String(r[3] || ''),
        likes: Number(r[4] || 1)
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    entries: entries
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    data = e.parameter || {};
  }

  // Handle like counter update
  if (data.action === 'like' && data.id) {
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        var curLikes = Number(rows[i][4] || 1) + 1;
        sheet.getRange(i + 1, 5).setValue(curLikes);
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          likes: curLikes
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  // Handle new guestbook sign-in
  var id = String(Date.now());
  var name = data.name || 'Anonymous';
  var message = data.message || '';
  var date = data.date || Utilities.formatDate(new Date(), "GMT+5:30", "MMM dd, yyyy, hh:mm a");
  var likes = 1;

  sheet.appendRow([id, name, message, date, likes]);

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    entry: { id: id, name: name, message: message, date: date, likes: likes }
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

### Step 3: Deploy as Web App
1. In the top right corner of Apps Script, click the blue **Deploy** button → **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description**: `Guestbook API`
   - **Execute as**: **`Me (your_email@gmail.com)`**
   - **Who has access**: **`Anyone`**  *(Very important! This allows visitors to sign without logging into Google)*
4. Click **Deploy**.
5. Google will ask to **Authorize Access**:
   - Click *Authorize access*, choose your Google account.
   - Click *Advanced* → *Go to Untitled project (unsafe)* → Click *Allow*.
6. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 4: Paste Your URL into `index.html`
Open `index.html` in your project and paste your URL:

```html
<script>
  window.GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
</script>
```

Save, commit, and push!

---

### 🎉 All Done!
Now every message signed by anyone on [https://arpi404.github.io/webiee/](https://arpi404.github.io/webiee/) is saved directly into your Google Sheet, permanent and 100% lifetime free!
