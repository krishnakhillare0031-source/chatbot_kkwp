# K. K. Wagh Polytechnic - Website Chatbot

A ready-to-use chat assistant for https://poly.kkwagh.edu.in/. No server, database, API key or library is needed. It is one JavaScript file.

## Files

| File | Purpose |
|---|---|
| `kkwagh-chatbot.js` | The chatbot (this is the only file you deploy) |
| `chatbot-demo.html` | A test page to try the chatbot before going live |
| `README.md` | This guide |

## 1. Test it (2 minutes)

1. Keep `kkwagh-chatbot.js` and `chatbot-demo.html` in the same folder.
2. Double-click `chatbot-demo.html`. It opens in your browser.
3. Click the blue chat button (bottom-right) and try the questions in the checklist below.

## 2. Deploy it (5 minutes)

1. Upload `kkwagh-chatbot.js` to your web server, for example into the site's `js/` folder (or the site root).
2. Add this line just before `</body>` in the footer file/template that is shared by all pages (so the chatbot appears on every page):

```html
<script src="https://poly.kkwagh.edu.in/js/kkwagh-chatbot.js" defer></script>
```

Change the path to wherever you uploaded the file. That's all.

Notes:
- If you only want it on the home page, add the line to `index.php` only.
- After updating the file later, add a version to force browsers to reload it: `kkwagh-chatbot.js?v=2`.
- If your site uses a Content-Security-Policy header, make sure scripts from your own domain are allowed (they usually are).

## 3. Test checklist (before you go live)

| Type this | Expected |
|---|---|
| `admission process` | CAP explanation + links to Prospectus, CAP steps, merit list, etc. |
| `documents required` | Document list by category + link |
| `computer technology` | 180 seats + department link |
| `how many seats` | All 8 courses, total 810 |
| `fees` | Prospectus / FRA / SBI Collect links |
| `contact` | Address, tappable phone numbers and emails |
| `प्रवेश` | Reply in Marathi (it switches automatically) |
| `admisson procedure` (typo) | Still gives the admission answer |
| `asdf` | Polite "couldn't find" reply; asking again shows the contact card |

Also check: open on your phone (chat should be full-screen), click each link, press the **EN / मराठी** button, press the restart (↻) button.

## 4. Optional: customise (no code knowledge needed)

Add a settings block **before** the script line:

```html
<script>
  window.KKW_CHATBOT_CONFIG = {
    color: "#0b3d91",          // header/button colour
    position: "right",         // or "left"
    autoGreeting: true,        // small "Need help with admissions?" popup
    extra: {
      // Text shown under the matching answer. Leave out what you don't want.
      fees:      "Add your official fee details here.",
      hostel:    "Add hostel seats / fee / rules here.",
      timings:   "Office: Mon-Sat, 9:30 AM to 5:30 PM",
      admission: "Admission helpdesk: <phone / email>",
      bus:       "", placement: "", library: ""
    },
    // Optional: see what students ask (to improve the bot)
    onEvent: function (type, data) {
      // type: "open", "question", "unanswered", "link"
      // e.g. send to Google Analytics, or console.log(type, data);
    }
  };
</script>
<script src="/js/kkwagh-chatbot.js" defer></script>
```

You can also open or control the chatbot from your own button:
`<button onclick="KKWChatbot.open()">Chat with us</button>`
(`KKWChatbot.ask("admission process")` also works.)

## 5. What the bot knows

All answers come from the official website pages: About/Vision/Mission, Courses and intake (810 seats), CAP admission links, documents list, scholarship, placement, library, hostel, bus, facilities, contact details, How to reach, faculty list, academic calendars, ERP, anti-ragging/grievance committees, mandatory disclosures, alumni, and department pages.

### Please check these three things
1. **Fees, hostel details and timings** are not on the pages the bot was built from, so it shows the official links and asks students to confirm with the office. Fill `extra.fees`, `extra.hostel` and `extra.timings` above to show them directly.
2. **NBA accreditation** is marked "up to June 2026" on your site. The bot says this and asks students to confirm the current status. Tell me (or edit the text of the `nba` answer) if it has been renewed.
3. **Marathi** replies cover all topics. Typing in Hindi is understood for common words, but replies come in English or Marathi.

## 6. Editing answers later

Open `kkwagh-chatbot.js` and look for the `INTENTS` list (section 3). Each topic has: keywords, an English answer and a Marathi answer. Use `**bold**`, lines starting with `- ` for bullets, and `[text](link)` for links. Run a quick check after editing by reloading the demo page.

## 7. Limits

- It answers from a fixed knowledge base using keyword matching (with typo tolerance). It does not "think" freely, so it will not invent answers. Unknown questions get the contact card.
- It does not collect personal data, and chat history stays in the visitor's own browser tab (session only).
