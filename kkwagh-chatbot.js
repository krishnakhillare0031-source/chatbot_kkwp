/*!
 * K. K. Wagh Polytechnic, Nashik - Website Chatbot  v1.0
 * ---------------------------------------------------------------
 * Self-contained: no backend, no libraries, no build step.
 * Install:  <script src="/path/kkwagh-chatbot.js" defer></script>
 * Optional settings (put BEFORE the script tag):
 *   <script>window.KKW_CHATBOT_CONFIG = { color:"#0b3d91", extra:{ fees:"..." } };</script>
 * See README.md for details.
 */
(function (root) {
  "use strict";

  /* ================================================================
   * 1. SETTINGS  (everything here can be overridden with
   *    window.KKW_CHATBOT_CONFIG - no need to edit this file)
   * ================================================================ */
  var DEFAULTS = {
    base: "https://poly.kkwagh.edu.in/",
    color: "#0b3d91",          // main colour (header, buttons)
    accent: "#f5a623",         // small highlights
    position: "right",         // "right" or "left"
    autoGreeting: true,        // small "Need help?" popup after a few seconds
    phones: [["(0253) 2517005", "02532517005"], ["(0253) 2517006", "02532517006"]],
    emails: ["principal-poly@kkwagh.edu.in", "disp-poly@kkwagh.edu.in"],
    address: "Hirabai Haridas Vidyanagari, Old Mumbai Agra Road, Amrutdham, Panchavati, Nashik, Maharashtra - 422003",
    // OPTIONAL extra details shown under the matching answer.
    // Leave "" to show only the official links. Example: fees: "FY Diploma tuition fee: Rs. ..."
    extra: { fees: "", hostel: "", timings: "", bus: "", placement: "", library: "", admission: "" },
    // OPTIONAL hooks for analytics / logging (all optional)
    onEvent: null,             // function (type, data)  types: open, question, unanswered, link
    storageKey: "kkw_chatbot_v1"
  };
  var CFG = (function () {
    var u = root.KKW_CHATBOT_CONFIG || {}, o = {}, k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in u) o[k] = u[k];
    o.extra = {};
    for (k in DEFAULTS.extra) o.extra[k] = (u.extra && u.extra[k]) || DEFAULTS.extra[k];
    return o;
  })();

  /* ================================================================
   * 2. SMALL HELPERS
   * ================================================================ */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function url(p) {
    if (/^(https?:|tel:|mailto:)/.test(p)) return p;
    return CFG.base + encodeURI(p);
  }
  // inline markup: **bold**, [label](url)
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, t, u) {
        return '<a href="' + esc(url(u.replace(/&amp;/g, "&"))) + '" target="_blank" rel="noopener">' + t + "</a>";
      });
  }
  // block markup: blank-line paragraphs, "- " bullets
  function fmt(text) {
    var out = [], list = false, lines = String(text).split("\n"), i, ln;
    for (i = 0; i < lines.length; i++) {
      ln = lines[i];
      if (/^- /.test(ln)) {
        if (!list) { out.push("<ul>"); list = true; }
        out.push("<li>" + inline(ln.slice(2)) + "</li>");
      } else {
        if (list) { out.push("</ul>"); list = false; }
        if (ln.replace(/\s/g, "") !== "") out.push("<p>" + inline(ln) + "</p>");
      }
    }
    if (list) out.push("</ul>");
    return out.join("");
  }
  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j, c;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    }
    return d[m][n];
  }
  function norm(s) {
    return " " + String(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9\u0900-\u097f\/ ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  }

  /* ================================================================
   * 3. KNOWLEDGE BASE  (verified from poly.kkwagh.edu.in)
   *    L(en label, mr label, page)   A(text, links, suggestion ids)
   * ================================================================ */
  function L(en, mr, path) { return [en, mr, path]; }
  function A(t, l, c) { return { t: t, l: l || [], c: c || [] }; }
  function I(id, kw, en, mr) { return { id: id, kw: kw, en: en, mr: mr || null }; }

  var DEPTS = [
    { id: "dept_computer", n: "Computer Technology", mr: "संगणक तंत्रज्ञान", seats: 180, nba: true, page: "computer_dept.php",
      kw: ["computer technology", "computer engineering", "computer dept", "computer department", "computer branch", "computer", "comp", "संगणक", "कॉम्प्युटर"] },
    { id: "dept_it", n: "Information Technology", mr: "माहिती तंत्रज्ञान", seats: 120, nba: true, page: "if_dept.php",
      kw: ["information technology", "it department", "it dept", "it branch", "it engineering", "it course", "diploma in it", "if dept", "माहिती तंत्रज्ञान"] },
    { id: "dept_aiml", n: "Artificial Intelligence & Machine Learning", mr: "आर्टिफिशियल इंटेलिजन्स आणि मशीन लर्निंग", seats: 120, nba: false, page: "aiml_dept.php",
      kw: ["artificial intelligence", "machine learning", "aiml", "ai ml", "ai and ml", "ai", "ml"] },
    { id: "dept_mech", n: "Mechanical Engineering", mr: "यांत्रिकी अभियांत्रिकी", seats: 120, nba: true, page: "mechanical_dept.php",
      kw: ["mechanical", "mech", "यांत्रिकी", "मेकॅनिकल"] },
    { id: "dept_ee", n: "Electrical Engineering", mr: "विद्युत अभियांत्रिकी", seats: 120, nba: true, page: "ee_dept.php",
      kw: ["electrical", "electric", "ee dept", "इलेक्ट्रिकल", "विद्युत"] },
    { id: "dept_civil", n: "Civil Engineering", mr: "स्थापत्य अभियांत्रिकी", seats: 60, nba: true, page: "civil_dept.php",
      kw: ["civil", "सिव्हिल", "स्थापत्य"] },
    { id: "dept_chem", n: "Chemical Engineering", mr: "रासायनिक अभियांत्रिकी", seats: 60, nba: true, page: "ch1_dept.php",
      kw: ["chemical", "chem eng", "केमिकल", "रासायनिक"] },
    { id: "dept_adis", n: "Advanced Diploma in Industrial Safety", mr: "औद्योगिक सुरक्षा प्रगत पदविका", seats: 30, nba: false, page: "adis_dept.php",
      kw: ["industrial safety", "adis", "advanced diploma", "safety diploma", "औद्योगिक सुरक्षा"] },
    { id: "dept_sh", n: "Science and Humanities", mr: "विज्ञान व मानव्यशास्त्र", seats: 0, nba: false, page: "science.php",
      kw: ["science and humanities", "humanities", "first year science", "applied science", "विज्ञान"] }
  ];

  var NBA_NOTE_EN = "Listed on the college website as NBA accredited (valid up to June 2026).";
  var NBA_NOTE_MR = "महाविद्यालयाच्या संकेतस्थळावर NBA मान्यताप्राप्त म्हणून नमूद (जून 2026 पर्यंत).";

  var INTENTS = [
    I("greet", ["hi", "hii", "hello", "hey", "namaste", "namaskar", "good morning", "good afternoon", "good evening", "नमस्कार", "नमस्ते", "हॅलो", "हेलो"],
      A("Hello! 👋 I'm the virtual assistant of **K. K. Wagh Polytechnic, Nashik**.\nWhat would you like to know? Pick a topic or type your question."),
      A("नमस्कार! 👋 मी **के. के. वाघ पॉलिटेक्निक, नाशिक** चा व्हर्च्युअल सहाय्यक आहे.\nआपल्याला काय जाणून घ्यायचे आहे? खालील विषय निवडा किंवा प्रश्न टाईप करा.")),

    I("menu", ["menu", "help", "options", "topics", "start", "what can you do", "मदत", "पर्याय", "मेनू"],
      A("Here is what I can help you with. Tap a topic or type your question:"),
      A("मी खालील विषयांत मदत करू शकतो. विषय निवडा किंवा प्रश्न टाईप करा:")),

    I("identity", ["who are you", "your name", "are you a bot", "are you bot", "what are you", "तू कोण", "तुम्ही कोण"],
      A("I'm an automated assistant for K. K. Wagh Polytechnic's website. I answer from the information published on the official site. For anything I can't answer, the college office is happy to help.", [], ["human", "menu"]),
      A("मी के. के. वाघ पॉलिटेक्निकच्या संकेतस्थळावरील स्वयंचलित सहाय्यक आहे. अधिकृत संकेतस्थळावरील माहितीवरून मी उत्तर देतो. इतर प्रश्नांसाठी कृपया महाविद्यालयाच्या कार्यालयाशी संपर्क करा.", [], ["human", "menu"])),

    I("about", ["about", "history", "established", "founded", "affiliated", "affiliation", "approved", "society", "institute", "institutes", "campus", "आमच्याबद्दल", "संस्थेबद्दल", "महाविद्यालय", "कॉलेज", "इतिहास"],
      A("**K. K. Wagh Polytechnic, Nashik** is run by K. K. Wagh Education Society.\n- Established in **1983** at Bhausaheb Nagar; moved in **1992** to the Hirabai Haridas Vidyanagari campus\n- Second shift started from the academic year **2008-09**\n- Affiliated to **MSBTE Mumbai**; approved by **AICTE New Delhi** and **DTE Mumbai**",
        [L("About us", "आमच्याबद्दल", "aboutinstitute.php"), L("Our institutes", "आमच्या संस्था", "ourinstitutes.php")], ["vision", "courses", "contact"]),
      A("**के. के. वाघ पॉलिटेक्निक, नाशिक** ही के. के. वाघ एज्युकेशन सोसायटीची संस्था आहे.\n- स्थापना **1983** मध्ये भाऊसाहेब नगर येथे; **1992** मध्ये हिराबाई हरिदास विद्यानगरी परिसरात स्थलांतर\n- शैक्षणिक वर्ष **2008-09** पासून दुसरी शिफ्ट सुरू\n- **MSBTE मुंबई** शी संलग्न; **AICTE नवी दिल्ली** व **DTE मुंबई** यांची मान्यता",
        [L("About us", "आमच्याबद्दल", "aboutinstitute.php"), L("Our institutes", "आमच्या संस्था", "ourinstitutes.php")], ["vision", "courses", "contact"])),

    I("vision", ["vision", "mission", "दृष्टी", "ध्येय"],
      A("**Vision:** Transform the students into competent diploma engineers by offering quality technical education and life skills.\n\n**Mission:**\n- Impart quality technical education and industry-relevant skills to diploma students\n- Foster innovative thinking, creativity, problem-solving skills and an entrepreneurial attitude\n- Instill a sustainable mindset, ethics and learning skills to support the growth of industry, society and the nation",
        [L("About us", "आमच्याबद्दल", "aboutinstitute.php")], ["about", "courses"]),
      A("**दृष्टी:** दर्जेदार तांत्रिक शिक्षण व जीवन कौशल्ये देऊन विद्यार्थ्यांना सक्षम पदविका अभियंता बनविणे.\n\n**ध्येय:**\n- उद्योगाभिमुख दर्जेदार तांत्रिक शिक्षण देणे\n- नावीन्यपूर्ण विचार, सर्जनशीलता, समस्या सोडविण्याचे कौशल्य व उद्योजकीय वृत्ती वाढविणे\n- शाश्वत विचार, नैतिकता व शिकण्याची कौशल्ये रुजविणे",
        [L("About us", "आमच्याबद्दल", "aboutinstitute.php")], ["about", "courses"])),

    I("principal", ["principal", "principal desk", "head of institute", "प्राचार्य"],
      A("You can read the Principal's message here. For direct communication, email **principal-poly@kkwagh.edu.in**.",
        [L("Principal's desk", "प्राचार्यांचा संदेश", "principal_desk.php"), L("Contact us", "संपर्क", "contactus.php")], ["contact", "about"]),
      A("प्राचार्यांचा संदेश खालील पानावर वाचता येईल. थेट संपर्कासाठी **principal-poly@kkwagh.edu.in** वर ईमेल करा.",
        [L("Principal's desk", "प्राचार्यांचा संदेश", "principal_desk.php"), L("Contact us", "संपर्क", "contactus.php")], ["contact", "about"])),

    I("courses", ["course", "courses", "branch", "branches", "diploma", "program", "programme", "programs", "seats", "intake", "stream", "total seats", "अभ्यासक्रम", "शाखा", "जागा", "कोर्स", "पदविका"],
      A("**Courses and intake (seats):**\n- Mechanical Engineering - 120\n- Electrical Engineering - 120\n- Computer Technology - 180\n- Information Technology - 120\n- Artificial Intelligence & Machine Learning - 120\n- Chemical Engineering - 60\n- Civil Engineering - 60\n- Advanced Diploma in Industrial Safety - 30\n\n**Total intake: 810 seats.** Tap a department below for details.",
        [L("Courses page", "अभ्यासक्रम पान", "coursesoffered.php")], ["dept_computer", "dept_it", "dept_aiml", "dept_mech", "dept_ee", "admission"]),
      A("**अभ्यासक्रम व प्रवेश क्षमता (जागा):**\n- मेकॅनिकल इंजिनिअरिंग - 120\n- इलेक्ट्रिकल इंजिनिअरिंग - 120\n- कॉम्प्युटर टेक्नॉलॉजी - 180\n- इन्फॉर्मेशन टेक्नॉलॉजी - 120\n- आर्टिफिशियल इंटेलिजन्स व मशीन लर्निंग - 120\n- केमिकल इंजिनिअरिंग - 60\n- सिव्हिल इंजिनिअरिंग - 60\n- अॅडव्हान्स्ड डिप्लोमा इन इंडस्ट्रियल सेफ्टी - 30\n\n**एकूण प्रवेश क्षमता: 810 जागा.** अधिक माहितीसाठी खालील विभाग निवडा.",
        [L("Courses page", "अभ्यासक्रम पान", "coursesoffered.php")], ["dept_computer", "dept_it", "dept_aiml", "dept_mech", "dept_ee", "admission"])),

    I("nba", ["nba", "accredit", "accredited", "accreditation", "मानांकन", "मान्यताप्राप्त"],
      A("On the college website, these courses are marked as **NBA accredited (valid up to June 2026)**: Mechanical, Electrical, Computer Technology, Information Technology, Chemical and Civil Engineering.\nAs that date has passed, please confirm the current status with the college office.",
        [L("Courses page", "अभ्यासक्रम पान", "coursesoffered.php")], ["contact", "courses"]),
      A("महाविद्यालयाच्या संकेतस्थळावर खालील अभ्यासक्रम **NBA मान्यताप्राप्त (जून 2026 पर्यंत)** म्हणून नमूद आहेत: मेकॅनिकल, इलेक्ट्रिकल, कॉम्प्युटर टेक्नॉलॉजी, इन्फॉर्मेशन टेक्नॉलॉजी, केमिकल व सिव्हिल.\nही तारीख उलटून गेल्याने सध्याची स्थिती कार्यालयाकडून कृपया खात्री करून घ्या.",
        [L("Courses page", "अभ्यासक्रम पान", "coursesoffered.php")], ["contact", "courses"])),

    I("admission", ["admission", "admissions", "admit", "apply", "application", "cap", "procedure", "process", "eligibility", "eligible", "prospectus", "merit list", "merit", "vacant", "last date", "admission schedule", "how to join", "dte", "प्रवेश", "अर्ज", "गुणवत्ता यादी", "प्रवेश पुस्तिका"],
      A("Admissions to the first year Diploma are through the **DTE Maharashtra CAP (Centralized Admission Process)**.\nThese official documents will help you:",
        [L("Prospectus 2026-27", "प्रवेश पुस्तिका 2026-27", "2026-27/Prospectus-2026-27.pdf"),
         L("CAP admission steps", "CAP प्रवेश प्रक्रिया", "2026-27/CAP Steps Details.pdf"),
         L("FY admission schedule & vacant seats", "प्रवेश वेळापत्रक व रिक्त जागा", "2026-27/ACAPFY.pdf"),
         L("Final merit list 2026-27", "अंतिम गुणवत्ता यादी 2026-27", "2026-27/meritlist1.pdf"),
         L("DTE information brochure", "DTE माहिती पुस्तिका", "2026-27/Diploma Information Brochure.pdf"),
         L("DTE rules for admissions", "DTE प्रवेश नियम", "2025-26/dterules.pdf"),
         L("DTE Maharashtra website", "DTE महाराष्ट्र संकेतस्थळ", "https://dte.maharashtra.gov.in/")],
        ["docs", "courses", "fees", "scholar"]),
      A("पहिल्या वर्षाच्या पदविका प्रवेशासाठी **DTE महाराष्ट्र केंद्रीय प्रवेश प्रक्रिया (CAP)** राबविली जाते.\nखालील अधिकृत कागदपत्रे उपयुक्त ठरतील:",
        [L("Prospectus 2026-27", "प्रवेश पुस्तिका 2026-27", "2026-27/Prospectus-2026-27.pdf"),
         L("CAP admission steps", "CAP प्रवेश प्रक्रिया", "2026-27/CAP Steps Details.pdf"),
         L("FY admission schedule & vacant seats", "प्रवेश वेळापत्रक व रिक्त जागा", "2026-27/ACAPFY.pdf"),
         L("Final merit list 2026-27", "अंतिम गुणवत्ता यादी 2026-27", "2026-27/meritlist1.pdf"),
         L("DTE information brochure", "DTE माहिती पुस्तिका", "2026-27/Diploma Information Brochure.pdf"),
         L("DTE rules for admissions", "DTE प्रवेश नियम", "2025-26/dterules.pdf"),
         L("DTE Maharashtra website", "DTE महाराष्ट्र संकेतस्थळ", "https://dte.maharashtra.gov.in/")],
        ["docs", "courses", "fees", "scholar"])),

    I("docs", ["document", "documents", "certificate", "certificates", "required", "papers", "marksheet", "mark sheet", "domicile", "caste", "income", "ews", "creamy", "non creamy", "what to bring", "कागदपत्र", "कागदपत्रे", "प्रमाणपत्र", "दाखला", "दस्तावेज"],
      A("**Documents required for First Year Diploma admission:**\n- SSC / HSC / ITI mark sheet\n- Nationality certificate / Birth certificate / Indian on LC\n- Domicile certificate\n- Latest School Leaving Certificate\n- Income certificate of 2025-26 (income limit up to Rs. 8.0 lakh)\n- Caste certificate - for VJ/DT-NT, OBC, SBC, SEBC and SC/ST\n- EWS eligibility certificate - for EWS category\n- Non-creamy layer certificate valid up to 31 March 2027 - for VJ/DT-NT, OBC, SBC, SEBC\n- Mobile number of student/parent and email ID of student\n\nRequirements depend on your category. See the full table for details.",
        [L("Full documents table", "संपूर्ण कागदपत्र तक्ता", "documents.php")], ["admission", "scholar", "contact"]),
      A("**प्रथम वर्ष पदविका प्रवेशासाठी आवश्यक कागदपत्रे:**\n- SSC / HSC / ITI गुणपत्रिका\n- राष्ट्रीयत्व प्रमाणपत्र / जन्म दाखला / LC वर 'भारतीय' नोंद\n- अधिवास (डोमिसाईल) प्रमाणपत्र\n- अलीकडील शाळा सोडल्याचा दाखला\n- 2025-26 चे उत्पन्न प्रमाणपत्र (उत्पन्न मर्यादा 8.0 लाखांपर्यंत)\n- जात प्रमाणपत्र - VJ/DT-NT, OBC, SBC, SEBC व SC/ST साठी\n- EWS पात्रता प्रमाणपत्र - EWS प्रवर्गासाठी\n- नॉन-क्रीमी लेयर प्रमाणपत्र (31 मार्च 2027 पर्यंत वैध) - VJ/DT-NT, OBC, SBC, SEBC साठी\n- विद्यार्थी/पालकांचा मोबाईल क्रमांक व विद्यार्थ्याचा ईमेल आयडी\n\nआवश्यक कागदपत्रे प्रवर्गानुसार बदलतात. तपशीलासाठी संपूर्ण तक्ता पहा.",
        [L("Full documents table", "संपूर्ण कागदपत्र तक्ता", "documents.php")], ["admission", "scholar", "contact"])),

    I("fees", ["fee", "fees", "fee structure", "payment", "pay", "sbi", "tuition", "cost", "charges", "how much", "शुल्क", "फी", "फीस"],
      A("Fee details for the current year are published in the Prospectus and on the Fee Regulating Authority page. Fees can be paid online through **SBI Collect**.\nFor the exact amount for your course and category, please confirm with the college office.",
        [L("Prospectus 2026-27", "प्रवेश पुस्तिका 2026-27", "2026-27/Prospectus-2026-27.pdf"), L("Fee Regulating Authority", "शुल्क नियामक प्राधिकरण", "fra.php"), L("SBI Collect (pay online)", "SBI Collect (ऑनलाइन भरणा)", "https://onlinesbi.sbi.bank.in/sbicollect/")],
        ["scholar", "admission", "contact"]),
      A("चालू वर्षाच्या शुल्काची माहिती प्रवेश पुस्तिकेत व शुल्क नियामक प्राधिकरणाच्या पानावर उपलब्ध आहे. शुल्क **SBI Collect** द्वारे ऑनलाइन भरता येते.\nआपल्या अभ्यासक्रम व प्रवर्गानुसार अचूक रकमेसाठी कृपया कार्यालयाशी संपर्क करा.",
        [L("Prospectus 2026-27", "प्रवेश पुस्तिका 2026-27", "2026-27/Prospectus-2026-27.pdf"), L("Fee Regulating Authority", "शुल्क नियामक प्राधिकरण", "fra.php"), L("SBI Collect (pay online)", "SBI Collect (ऑनलाइन भरणा)", "https://onlinesbi.sbi.bank.in/sbicollect/")],
        ["scholar", "admission", "contact"])),

    I("scholar", ["scholarship", "scholarships", "freeship", "mahadbt", "tfws", "financial aid", "शिष्यवृत्ती", "स्कॉलरशिप", "छात्रवृत्ति"],
      A("Information about scholarships and the list of documents needed is available below. Applications are made through the **MahaDBT portal**.",
        [L("Scholarship page", "शिष्यवृत्ती पान", "scholarship.php"), L("Scholarship documents list", "शिष्यवृत्ती कागदपत्र यादी", "2026-27/Scholarship.pdf"), L("MahaDBT portal", "MahaDBT पोर्टल", "https://mahadbt.maharashtra.gov.in/")],
        ["docs", "fees", "contact"]),
      A("शिष्यवृत्तीची माहिती व आवश्यक कागदपत्रांची यादी खाली उपलब्ध आहे. अर्ज **MahaDBT पोर्टल** द्वारे करावा.",
        [L("Scholarship page", "शिष्यवृत्ती पान", "scholarship.php"), L("Scholarship documents list", "शिष्यवृत्ती कागदपत्र यादी", "2026-27/Scholarship.pdf"), L("MahaDBT portal", "MahaDBT पोर्टल", "https://mahadbt.maharashtra.gov.in/")],
        ["docs", "fees", "contact"])),

    I("placement", ["placement", "placements", "job", "jobs", "recruit", "recruitment", "recruiter", "career", "careers", "training", "package", "companies", "salary", "प्लेसमेंट", "नोकरी", "नियुक्ती", "रोजगार"],
      A("The college has a **Training & Placement** cell. You can see placement data, career opportunities and training details here:",
        [L("Training & Placement", "प्रशिक्षण व नियुक्ती", "trainingplacement.php"), L("Placement data (PDF)", "प्लेसमेंट माहिती (PDF)", "NBA/Placement.pdf"), L("Career opportunities", "करिअर संधी", "career.php")],
        ["courses", "contact"]),
      A("महाविद्यालयात **प्रशिक्षण व नियुक्ती (Training & Placement)** विभाग आहे. प्लेसमेंट माहिती, करिअर संधी व प्रशिक्षणाचा तपशील येथे पहा:",
        [L("Training & Placement", "प्रशिक्षण व नियुक्ती", "trainingplacement.php"), L("Placement data (PDF)", "प्लेसमेंट माहिती (PDF)", "NBA/Placement.pdf"), L("Career opportunities", "करिअर संधी", "career.php")],
        ["courses", "contact"])),

    I("library", ["library", "books", "book", "journal", "journals", "magazine", "magazines", "e-resource", "e-resources", "online library", "ग्रंथालय", "लायब्ररी", "पुस्तकालय", "पुस्तके"],
      A("The college library offers books, journals & magazines and online e-resources. Library rules, staff and facilities are listed on the library pages.",
        [L("Library", "ग्रंथालय", "library.php"), L("Books", "पुस्तके", "books.php"), L("Journals & magazines", "नियतकालिके", "libjm.php"), L("Online e-resources", "ऑनलाइन संसाधने", "onlinelib.php"), L("Library rules", "ग्रंथालय नियम", "librules.php")],
        ["facilities", "contact"]),
      A("महाविद्यालयाच्या ग्रंथालयात पुस्तके, नियतकालिके व ऑनलाइन ई-संसाधने उपलब्ध आहेत. ग्रंथालयाचे नियम, कर्मचारी व सुविधा संबंधित पानांवर आहेत.",
        [L("Library", "ग्रंथालय", "library.php"), L("Books", "पुस्तके", "books.php"), L("Journals & magazines", "नियतकालिके", "libjm.php"), L("Online e-resources", "ऑनलाइन संसाधने", "onlinelib.php"), L("Library rules", "ग्रंथालय नियम", "librules.php")],
        ["facilities", "contact"])),

    I("hostel", ["hostel", "mess", "accommodation", "stay", "boarding", "वसतिगृह", "हॉस्टेल", "मेस", "छात्रावास", "राहण्याची"],
      A("The college provides **Hostel and Mess** facilities. For seat availability, fees and rules, please see the hostel page or contact the office.",
        [L("Hostel & Mess", "वसतिगृह व मेस", "hostelmess.php"), L("Contact us", "संपर्क", "contactus.php")], ["facilities", "bus", "contact"]),
      A("महाविद्यालयात **वसतिगृह व मेस** सुविधा उपलब्ध आहे. जागा, शुल्क व नियमांसाठी वसतिगृह पान पहा किंवा कार्यालयाशी संपर्क करा.",
        [L("Hostel & Mess", "वसतिगृह व मेस", "hostelmess.php"), L("Contact us", "संपर्क", "contactus.php")], ["facilities", "bus", "contact"])),

    I("bus", ["bus", "buses", "transport", "transportation", "बस", "वाहतूक", "परिवहन"],
      A("The college has a **bus facility**. Please see the page for routes and details.",
        [L("Bus facility", "बस सुविधा", "bus.php")], ["facilities", "reach"]),
      A("महाविद्यालयात **बस सुविधा** उपलब्ध आहे. मार्ग व तपशीलासाठी पान पहा.",
        [L("Bus facility", "बस सुविधा", "bus.php")], ["facilities", "reach"])),

    I("facilities", ["facilities", "campus facility", "canteen", "gym", "gymnasium", "sports", "bank", "medical", "health", "counselling", "counseling", "amenities", "infrastructure", "सुविधा", "कॅन्टीन", "क्रीडा", "व्यायामशाळा", "समुपदेशन"],
      A("**Campus facilities** at K. K. Wagh Polytechnic:",
        [L("Library", "ग्रंथालय", "library.php"), L("Hostel & Mess", "वसतिगृह व मेस", "hostelmess.php"), L("Bus", "बस", "bus.php"), L("Canteen", "कॅन्टीन", "canteen.php"), L("Sports & Gymnasium", "क्रीडा व व्यायामशाळा", "gym.php"), L("Medical", "वैद्यकीय", "medical.php"), L("Bank", "बँक", "bank.php"), L("Counselling", "समुपदेशन", "Counselling.php")],
        ["hostel", "library", "bus"]),
      A("**के. के. वाघ पॉलिटेक्निकमधील परिसर सुविधा:**",
        [L("Library", "ग्रंथालय", "library.php"), L("Hostel & Mess", "वसतिगृह व मेस", "hostelmess.php"), L("Bus", "बस", "bus.php"), L("Canteen", "कॅन्टीन", "canteen.php"), L("Sports & Gymnasium", "क्रीडा व व्यायामशाळा", "gym.php"), L("Medical", "वैद्यकीय", "medical.php"), L("Bank", "बँक", "bank.php"), L("Counselling", "समुपदेशन", "Counselling.php")],
        ["hostel", "library", "bus"])),

    I("contact", ["contact", "phone", "call", "email", "mail", "address", "number", "get in touch", "telephone", "संपर्क", "फोन", "ईमेल", "पत्ता", "क्रमांक"],
      null, null),   // built dynamically from settings (see contactAnswer)

    I("human", ["human", "agent", "talk to", "speak to", "call me", "real person", "representative", "office staff", "कर्मचारी"],
      null, null),   // same card as contact

    I("reach", ["reach", "location", "directions", "route", "map", "how to come", "how to get", "where is", "लोकेशन", "कसे पोहोचायचे", "कुठे आहे"],
      A("**Our address:**\n" + CFG.address + "\n\nThe 'How to reach' page has the route and map.",
        [L("How to reach us", "आमच्यापर्यंत कसे पोहोचाल", "howtoreach.php"), L("Open in Google Maps", "Google Maps मध्ये उघडा", "https://www.google.com/maps/search/?api=1&query=K.+K.+Wagh+Polytechnic+Nashik")], ["bus", "contact"]),
      A("**आमचा पत्ता:**\nके. के. वाघ पॉलिटेक्निक, हिराबाई हरिदास विद्यानगरी, जुना मुंबई-आगरा रोड, अमृतधाम, पंचवटी, नाशिक - 422003\n\n'कसे पोहोचाल' पानावर मार्ग व नकाशा आहे.",
        [L("How to reach us", "आमच्यापर्यंत कसे पोहोचाल", "howtoreach.php"), L("Open in Google Maps", "Google Maps मध्ये उघडा", "https://www.google.com/maps/search/?api=1&query=K.+K.+Wagh+Polytechnic+Nashik")], ["bus", "contact"])),

    I("timings", ["timing", "timings", "office hours", "office time", "college time", "working hours", "working days", "open today", "वेळ", "कार्यालयीन वेळ"],
      A("Office and college timings are not published on the website, so please call the office to confirm before visiting.", [L("Contact us", "संपर्क", "contactus.php")], ["contact", "reach"]),
      A("कार्यालय व महाविद्यालयाच्या वेळा संकेतस्थळावर दिलेल्या नाहीत. भेट देण्यापूर्वी कृपया कार्यालयात फोन करून खात्री करा.", [L("Contact us", "संपर्क", "contactus.php")], ["contact", "reach"])),

    I("faculty", ["faculty", "teacher", "teachers", "staff", "professor", "hod", "faculty list", "शिक्षक", "प्राध्यापक", "फॅकल्टी"],
      A("The faculty list for 2025-26 and faculty details are here:",
        [L("Faculty list 2025-26 (PDF)", "प्राध्यापक यादी 2025-26 (PDF)", "NBA/Faculty List 2025-26.pdf"), L("Faculty page", "प्राध्यापक पान", "faculty.php")], ["courses", "contact"]),
      A("2025-26 ची प्राध्यापक यादी व माहिती येथे आहे:",
        [L("Faculty list 2025-26 (PDF)", "प्राध्यापक यादी 2025-26 (PDF)", "NBA/Faculty List 2025-26.pdf"), L("Faculty page", "प्राध्यापक पान", "faculty.php")], ["courses", "contact"])),

    I("calendar", ["calendar", "exam", "exams", "timetable", "time table", "holiday", "holidays", "academic calendar", "परीक्षा", "वेळापत्रक", "दिनदर्शिका"],
      A("Academic calendars are available below. Exam notices and timetables are published by **MSBTE**.",
        [L("MSBTE academic calendar 2025-26", "MSBTE शैक्षणिक दिनदर्शिका 2025-26", "2025-26/AcademicCalendar2025-26.pdf"), L("Institute calendar 2025-26", "संस्था दिनदर्शिका 2025-26", "2025-26/ac25-26.pdf"), L("MSBTE website", "MSBTE संकेतस्थळ", "https://msbte.org.in/")], ["erp", "contact"]),
      A("शैक्षणिक दिनदर्शिका खाली उपलब्ध आहे. परीक्षेच्या सूचना व वेळापत्रक **MSBTE** प्रसिद्ध करते.",
        [L("MSBTE academic calendar 2025-26", "MSBTE शैक्षणिक दिनदर्शिका 2025-26", "2025-26/AcademicCalendar2025-26.pdf"), L("Institute calendar 2025-26", "संस्था दिनदर्शिका 2025-26", "2025-26/ac25-26.pdf"), L("MSBTE website", "MSBTE संकेतस्थळ", "https://msbte.org.in/")], ["erp", "contact"])),

    I("erp", ["erp", "login", "portal", "attendance", "result", "results", "student login", "निकाल", "लॉगिन"],
      A("Students can log in to the college **ERP portal**. Official exam results are published by **MSBTE**.",
        [L("ERP login", "ERP लॉगिन", "https://erp.kkwagh.edu.in/"), L("MSBTE website", "MSBTE संकेतस्थळ", "https://msbte.org.in/")], ["calendar", "contact"]),
      A("विद्यार्थी महाविद्यालयाच्या **ERP पोर्टल** वर लॉगिन करू शकतात. अधिकृत परीक्षा निकाल **MSBTE** प्रसिद्ध करते.",
        [L("ERP login", "ERP लॉगिन", "https://erp.kkwagh.edu.in/"), L("MSBTE website", "MSBTE संकेतस्थळ", "https://msbte.org.in/")], ["calendar", "contact"])),

    I("safety", ["ragging", "anti ragging", "complaint", "grievance", "harassment", "vishakha", "sc/st", "redressal", "ummeed", "manodarpan", "रॅगिंग", "तक्रार"],
      A("The college has committees and cells for student safety and support:",
        [L("Anti-Ragging", "रॅगिंग प्रतिबंध", "antiragging.php"), L("Grievance Redressal Cell", "तक्रार निवारण कक्ष", "grievanceredressal.php"), L("Internal Complaint Committee", "अंतर्गत तक्रार समिती", "internalcomplaints_info.php"), L("Vishakha Committee", "विशाखा समिती", "vishakhacommittee.php"), L("SC/ST Cell", "SC/ST कक्ष", "scstcell.php"), L("UMMEED & MANODARPAN", "उम्मीद व मनोदर्पण", "umeed.php")], ["human", "contact"]),
      A("विद्यार्थ्यांच्या सुरक्षेसाठी व सहाय्यासाठी महाविद्यालयात खालील समित्या/कक्ष आहेत:",
        [L("Anti-Ragging", "रॅगिंग प्रतिबंध", "antiragging.php"), L("Grievance Redressal Cell", "तक्रार निवारण कक्ष", "grievanceredressal.php"), L("Internal Complaint Committee", "अंतर्गत तक्रार समिती", "internalcomplaints_info.php"), L("Vishakha Committee", "विशाखा समिती", "vishakhacommittee.php"), L("SC/ST Cell", "SC/ST कक्ष", "scstcell.php"), L("UMMEED & MANODARPAN", "उम्मीद व मनोदर्पण", "umeed.php")], ["human", "contact"])),

    I("alumni", ["alumni", "alumnus", "old student", "passout", "माजी विद्यार्थी", "अल्युमनी"],
      A("Former students can register with the alumni network here:",
        [L("Register as Alumni", "माजी विद्यार्थी नोंदणी", "https://www.almashines.com/kkwagh/account?cid=63"), L("Alumni Association certificate", "अल्युमनी असोसिएशन प्रमाणपत्र", "insttpdf/Alumni_Reg.pdf")], ["contact"]),
      A("माजी विद्यार्थी येथे अल्युमनी नेटवर्कमध्ये नोंदणी करू शकतात:",
        [L("Register as Alumni", "माजी विद्यार्थी नोंदणी", "https://www.almashines.com/kkwagh/account?cid=63"), L("Alumni Association certificate", "अल्युमनी असोसिएशन प्रमाणपत्र", "insttpdf/Alumni_Reg.pdf")], ["contact"])),

    I("disclosure", ["disclosure", "mandatory", "aicte eoa", "eoa", "governing body", "board", "board of directors", "chairman", "msbte affiliation", "service rules", "अनिवार्य माहिती"],
      A("Official disclosures and governance documents:",
        [L("Mandatory disclosure", "अनिवार्य माहिती", "mandatorydisclosure.php"), L("AICTE EOA", "AICTE EOA", "aicteeoa.php"), L("MSBTE affiliation", "MSBTE संलग्नता", "msbteaff.php"), L("Governing body", "प्रशासकीय मंडळ", "governingbody.php"), L("Board of Directors", "संचालक मंडळ", "board_of_directors.php"), L("Chairman's message", "अध्यक्षांचा संदेश", "president_msg.php")], ["about", "contact"]),
      A("अधिकृत माहिती व प्रशासकीय कागदपत्रे:",
        [L("Mandatory disclosure", "अनिवार्य माहिती", "mandatorydisclosure.php"), L("AICTE EOA", "AICTE EOA", "aicteeoa.php"), L("MSBTE affiliation", "MSBTE संलग्नता", "msbteaff.php"), L("Governing body", "प्रशासकीय मंडळ", "governingbody.php"), L("Board of Directors", "संचालक मंडळ", "board_of_directors.php"), L("Chairman's message", "अध्यक्षांचा संदेश", "president_msg.php")], ["about", "contact"])),

    I("achievements", ["achievement", "achievements", "award", "awards", "record", "world record", "winners", "nasa", "sih", "recognition", "यश", "पुरस्कार"],
      A("**A few highlights from the college website:**\n- An alumna set a **Genius Book of World Records** entry for the longest lecture on women entrepreneurship (540 minutes)\n- An alumna was part of a team that won an award at NASA's Human Exploration Rover Challenge\n- Electrical Engineering department students won State Level MSBTE project competitions\n- The Chemical Engineering department organised an MSBTE-sponsored state-level technical paper presentation competition",
        [L("Media news", "माध्यम बातम्या", "media.php")], ["about", "courses"]),
      A("**संकेतस्थळावरील काही ठळक बाबी:**\n- माजी विद्यार्थिनीची महिला उद्योजकतेवर सलग 540 मिनिटांच्या व्याख्यानासाठी **Genius Book of World Records** मध्ये नोंद\n- माजी विद्यार्थिनी NASA च्या Human Exploration Rover Challenge मध्ये पुरस्कारप्राप्त संघात सहभागी\n- इलेक्ट्रिकल इंजिनिअरिंग विभागाचे विद्यार्थी राज्यस्तरीय MSBTE प्रकल्प स्पर्धेचे विजेते\n- केमिकल इंजिनिअरिंग विभागाने MSBTE प्रायोजित राज्यस्तरीय तांत्रिक शोधनिबंध सादरीकरण स्पर्धा आयोजित केली",
        [L("Media news", "माध्यम बातम्या", "media.php")], ["about", "courses"])),

    I("media", ["news", "media", "events", "event", "youtube", "video", "videos", "notice", "notices", "latest news", "बातम्या", "कार्यक्रम"],
      A("Latest news and videos:",
        [L("Media news", "माध्यम बातम्या", "media.php"), L("Official YouTube channel", "अधिकृत YouTube चॅनेल", "https://www.youtube.com/channel/UC9m-8o7d34-tmIg_a2vuuDQ")], ["admission", "calendar"]),
      A("ताज्या बातम्या व व्हिडिओ:",
        [L("Media news", "माध्यम बातम्या", "media.php"), L("Official YouTube channel", "अधिकृत YouTube चॅनेल", "https://www.youtube.com/channel/UC9m-8o7d34-tmIg_a2vuuDQ")], ["admission", "calendar"])),

    I("faq", ["faq", "faqs", "frequently asked"],
      A("Frequently asked questions are collected on this page:", [L("FAQ", "वारंवार विचारले जाणारे प्रश्न", "faq.php")], ["admission", "contact"]),
      A("वारंवार विचारले जाणारे प्रश्न या पानावर आहेत:", [L("FAQ", "वारंवार विचारले जाणारे प्रश्न", "faq.php")], ["admission", "contact"])),

    I("thanks", ["thanks", "thank you", "thankyou", "thx", "great", "awesome", "धन्यवाद", "आभार", "शुक्रिया"],
      A("You're welcome! 😊 Is there anything else I can help you with?", [], ["menu", "contact"]),
      A("आपले स्वागत आहे! 😊 आणखी काही मदत हवी आहे का?", [], ["menu", "contact"])),

    I("bye", ["bye", "goodbye", "see you", "ok bye", "alvida", "निरोप"],
      A("Goodbye! 👋 Best wishes from K. K. Wagh Polytechnic. Come back anytime.", [], []),
      A("निरोप! 👋 के. के. वाघ पॉलिटेक्निकतर्फे शुभेच्छा. केव्हाही परत या.", [], []))
  ];

  // department answers are generated from DEPTS
  DEPTS.forEach(function (d) {
    var seatsEn = d.seats ? "Intake: **" + d.seats + " seats**." : "This department teaches the first-year science and humanities subjects.";
    var seatsMr = d.seats ? "प्रवेश क्षमता: **" + d.seats + " जागा**." : "हा विभाग प्रथम वर्षाचे विज्ञान व मानव्यशास्त्र विषय शिकवतो.";
    var links = [L(d.n + " department", d.mr + " विभाग", d.page), L("All courses", "सर्व अभ्यासक्रम", "coursesoffered.php")];
    INTENTS.push(I(d.id, d.kw,
      A("**" + d.n + "**\n" + seatsEn + (d.nba ? "\n" + NBA_NOTE_EN : ""), links, ["admission", "docs", "courses"]),
      A("**" + d.mr + "**\n" + seatsMr + (d.nba ? "\n" + NBA_NOTE_MR : ""), links, ["admission", "docs", "courses"])));
  });

  function byId(id) {
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].id === id) return INTENTS[i];
    return null;
  }

  function contactAnswer(lang) {
    var ph = CFG.phones.map(function (p) { return "[" + p[0] + "](tel:" + p[1] + ")"; }).join(" | ");
    var em = CFG.emails.map(function (e) { return "- [" + e + "](mailto:" + e + ")"; }).join("\n");
    var t = lang === "mr"
      ? "**के. के. वाघ पॉलिटेक्निक, नाशिक**\n" + CFG.address + "\n\n📞 " + ph + "\n✉️ ईमेल:\n" + em
      : "**K. K. Wagh Polytechnic, Nashik**\n" + CFG.address + "\n\n📞 " + ph + "\n✉️ Email:\n" + em;
    return A(t, [L("Contact page", "संपर्क पान", "contactus.php"), L("How to reach us", "कसे पोहोचाल", "howtoreach.php")], ["reach", "admission", "timings"]);
  }

  /* chip labels: id -> [English, Marathi, emoji] */
  var LABELS = {
    admission: ["Admission process", "प्रवेश प्रक्रिया", "📝"], courses: ["Courses & seats", "अभ्यासक्रम व जागा", "🎓"],
    docs: ["Documents required", "आवश्यक कागदपत्रे", "📄"], fees: ["Fees", "शुल्क", "💰"], scholar: ["Scholarship", "शिष्यवृत्ती", "🏅"],
    placement: ["Placement", "प्लेसमेंट", "💼"], facilities: ["Campus facilities", "परिसर सुविधा", "🏫"], contact: ["Contact us", "संपर्क", "📞"],
    hostel: ["Hostel & mess", "वसतिगृह व मेस", "🛏️"], library: ["Library", "ग्रंथालय", "📚"], bus: ["Bus facility", "बस सुविधा", "🚌"],
    about: ["About the college", "महाविद्यालयाबद्दल", "ℹ️"], vision: ["Vision & mission", "दृष्टी व ध्येय", "🎯"], reach: ["How to reach", "कसे पोहोचाल", "📍"],
    timings: ["Office timings", "कार्यालयीन वेळ", "🕘"], human: ["Talk to the office", "कार्यालयाशी बोला", "🙋"], menu: ["Main menu", "मुख्य मेनू", "☰"],
    calendar: ["Academic calendar", "शैक्षणिक दिनदर्शिका", "🗓️"], erp: ["ERP login", "ERP लॉगिन", "🔐"]
  };
  DEPTS.forEach(function (d) { LABELS[d.id] = [d.n, d.mr, "🏷️"]; });
  var MENU = ["admission", "courses", "docs", "fees", "scholar", "placement", "facilities", "contact"];

  /* ================================================================
   * 4. MATCHING ENGINE  (keywords + typo tolerance)
   * ================================================================ */
  var STOP_LATIN = /^[a-z0-9 \/]+$/;
  function matchIntent(q) {
    var t = norm(q), toks = t.trim().split(" "), best = null, top = 0, i, j, k, it, score, kw, hit, w, x;
    if (t.trim() === "it") return byId("dept_it");
    for (i = 0; i < INTENTS.length; i++) {
      it = INTENTS[i]; score = 0;
      for (j = 0; j < it.kw.length; j++) {
        kw = it.kw[j]; hit = false; w = kw.length;
        var latin = STOP_LATIN.test(kw), multi = kw.indexOf(" ") > -1;
        if (latin && !multi && kw.length <= 4) {
          hit = t.indexOf(" " + kw + " ") > -1;
        } else if (t.indexOf(kw) > -1) {
          hit = true;
        } else if (latin && !multi && kw.length >= 5) {
          for (x = 0; x < toks.length; x++) {
            if (toks[x].length >= 4 && Math.abs(toks[x].length - kw.length) <= 2 &&
                lev(toks[x], kw) <= (kw.length >= 8 ? 2 : 1)) { hit = true; w = kw.length - 1; break; }
          }
        }
        if (hit) score += w;
      }
      if (score > top) { top = score; best = it; }
    }
    return best;
  }

  /* ================================================================
   * 5. UI TEXT
   * ================================================================ */
  var UI = {
    en: { sub: "Online - replies instantly", ph: "Type your question...", send: "Send", reset: "Restart chat", close: "Close chat", open: "Open chat",
      lang: "मराठी", langTitle: "मराठीत बोला", tip: "Need help with admissions? Ask me! 👋", foot: "Automated assistant. Please confirm important details with the college office.",
      welcome: "👋 **Welcome to K. K. Wagh Polytechnic, Nashik!**\nI can help with admissions, courses, documents, fees, facilities and more. Pick a topic or type your question.",
      fallback: "Sorry, I couldn't find an answer to that. Try asking about **admission, courses, documents, fees, scholarship, placement, hostel** or **contact**.",
      fallback2: "I'm still unable to find that. For a quick answer, please contact the college office directly:", more: "Anything else I can help with?" },
    mr: { sub: "ऑनलाइन - त्वरित उत्तर", ph: "आपला प्रश्न टाईप करा...", send: "पाठवा", reset: "चॅट पुन्हा सुरू करा", close: "चॅट बंद करा", open: "चॅट उघडा",
      lang: "EN", langTitle: "Switch to English", tip: "प्रवेशाबद्दल मदत हवी आहे का? मला विचारा! 👋", foot: "स्वयंचलित सहाय्यक. महत्त्वाच्या माहितीची खात्री कृपया कार्यालयाकडून करा.",
      welcome: "👋 **के. के. वाघ पॉलिटेक्निक, नाशिक मध्ये आपले स्वागत आहे!**\nमी प्रवेश, अभ्यासक्रम, कागदपत्रे, शुल्क, सुविधा इत्यादींबद्दल मदत करू शकतो. विषय निवडा किंवा प्रश्न टाईप करा.",
      fallback: "क्षमस्व, मला याचे उत्तर सापडले नाही. कृपया **प्रवेश, अभ्यासक्रम, कागदपत्रे, शुल्क, शिष्यवृत्ती, प्लेसमेंट, वसतिगृह** किंवा **संपर्क** याबद्दल विचारा.",
      fallback2: "अजूनही उत्तर सापडत नाही. त्वरित माहितीसाठी कृपया कार्यालयाशी थेट संपर्क साधा:", more: "आणखी काही मदत हवी आहे का?" }
  };

  /* ================================================================
   * 6. TEST EXPORT (Node only) - no effect in the browser
   * ================================================================ */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { match: function (q) { var m = matchIntent(q); return m ? m.id : null; }, INTENTS: INTENTS };
  }
  if (typeof document === "undefined") return;

  /* ================================================================
   * 7. WIDGET (Shadow DOM so the college site's CSS cannot break it)
   * ================================================================ */
  var state = { lang: "en", open: false, fails: 0, msgs: [], tipShown: false };
  var host, sh, panel, list, input, launcher, tipEl, typingEl, langBtn, subEl, footEl, sendBtn, titleEl;

  function save() { try { sessionStorage.setItem(CFG.storageKey, JSON.stringify({ lang: state.lang, open: state.open, msgs: state.msgs.slice(-40), tip: state.tipShown })); } catch (e) {} }
  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(CFG.storageKey) || "null");
      if (s && s.msgs) { state.lang = s.lang || "en"; state.open = !!s.open; state.msgs = s.msgs; state.tipShown = !!s.tip; }
    } catch (e) {}
  }
  function emit(type, data) { try { if (typeof CFG.onEvent === "function") CFG.onEvent(type, data); } catch (e) {} }
  function T(k) { return UI[state.lang][k]; }
  function now() { try { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function label(id) { var l = LABELS[id]; return l ? l[state.lang === "mr" ? 1 : 0] : id; }
  function scrollDown() { list.scrollTop = list.scrollHeight; }

  var CSS = ":host{all:initial}*{box-sizing:border-box}" +
    ".wrap{font:14px/1.5 -apple-system,'Segoe UI',Roboto,Arial,'Noto Sans Devanagari',sans-serif;color:#1f2937}" +
    ".launch{position:fixed;bottom:max(20px,env(safe-area-inset-bottom));" + (CFG.position === "left" ? "left" : "right") + ":20px;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;background:var(--c);color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.28);z-index:2147483000;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".launch:hover{transform:scale(1.07)}.launch:focus-visible,button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid var(--a);outline-offset:2px}" +
    ".launch svg{width:30px;height:30px;fill:#fff}.dot{position:absolute;top:6px;right:6px;width:13px;height:13px;border-radius:50%;background:#ef4444;border:2px solid #fff}" +
    ".tip{position:fixed;bottom:92px;" + (CFG.position === "left" ? "left" : "right") + ":20px;max-width:240px;background:#fff;border-radius:12px;padding:10px 30px 10px 12px;box-shadow:0 6px 24px rgba(0,0,0,.22);z-index:2147483000;cursor:pointer;animation:pop .3s}" +
    ".tip button{position:absolute;top:2px;right:4px;border:0;background:none;font-size:18px;cursor:pointer;color:#6b7280}" +
    ".panel{position:fixed;bottom:92px;" + (CFG.position === "left" ? "left" : "right") + ":20px;width:390px;height:620px;max-height:calc(100vh - 110px);background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.30);display:none;flex-direction:column;overflow:hidden;z-index:2147483000;animation:pop .2s}" +
    ".panel.open{display:flex}@keyframes pop{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}" +
    ".head{background:linear-gradient(135deg,var(--c),var(--c2));color:#fff;padding:12px 12px 12px 14px;display:flex;align-items:center;gap:10px}" +
    ".logo{width:40px;height:40px;border-radius:50%;background:#fff;color:var(--c);display:flex;align-items:center;justify-content:center;font-size:22px;flex:none}" +
    ".ht{flex:1;min-width:0}.ht b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ht small{display:flex;align-items:center;gap:5px;opacity:.92;font-size:12px}" +
    ".ht small:before{content:'';width:8px;height:8px;border-radius:50%;background:#34d399}" +
    ".hb{background:rgba(255,255,255,.18);border:0;color:#fff;border-radius:8px;min-width:32px;height:32px;padding:0 8px;cursor:pointer;font-size:13px;font-weight:600}.hb:hover{background:rgba(255,255,255,.3)}" +
    ".msgs{position:relative;flex:1;overflow-y:auto;padding:14px 12px 6px;background:#f3f4f8;scroll-behavior:smooth}" +
    ".row{display:flex;gap:8px;margin:0 0 12px;align-items:flex-end}.row.u{justify-content:flex-end}" +
    ".av{width:28px;height:28px;border-radius:50%;background:var(--c);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex:none}" +
    ".col{max-width:84%;display:flex;flex-direction:column}.row.u .col{align-items:flex-end}" +
    ".bub{padding:10px 13px;border-radius:16px;word-wrap:break-word;overflow-wrap:anywhere}" +
    ".bub.b{background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px}.bub.u{background:var(--c);color:#fff;border-bottom-right-radius:4px}" +
    ".bub p{margin:0 0 6px}.bub p:last-child{margin:0}.bub ul{margin:2px 0 6px;padding-left:18px}.bub li{margin:2px 0}.bub a{color:var(--c);font-weight:600}" +
    ".ts{font-size:11px;color:#9ca3af;margin:3px 4px 0}" +
    ".links{display:flex;flex-direction:column;gap:6px;margin-top:10px}" +
    ".links a{display:flex;justify-content:space-between;align-items:center;gap:8px;text-decoration:none;border:1px solid var(--c);color:var(--c);background:#fff;border-radius:10px;padding:7px 10px;font-size:13px;font-weight:600}" +
    ".links a:hover{background:var(--c);color:#fff}.links a:after{content:'\\2197';font-size:14px}" +
    ".menu{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px 36px}" +
    ".menu button{display:flex;align-items:center;gap:8px;text-align:left;background:#fff;border:1px solid #d9deea;border-radius:12px;padding:9px 10px;font-size:13px;cursor:pointer;color:#1f2937;font-family:inherit}" +
    ".menu button:hover{border-color:var(--c);background:#eef3ff}.menu span{font-size:18px}" +
    ".chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px 36px}" +
    ".chips button{border:1px solid var(--c);background:#fff;color:var(--c);border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer;font-family:inherit}.chips button:hover{background:var(--c);color:#fff}" +
    ".typing{display:flex;gap:4px;padding:12px 14px}.typing i{width:7px;height:7px;border-radius:50%;background:#9ca3af;animation:b 1.2s infinite}.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}" +
    "@keyframes b{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}" +
    ".form{display:flex;gap:8px;padding:10px;border-top:1px solid #e5e7eb;background:#fff}" +
    ".form input{flex:1;min-width:0;border:1px solid #d1d5db;border-radius:999px;padding:10px 14px;font-size:14px;font-family:inherit;outline:none}.form input:focus{border-color:var(--c)}" +
    ".form button{width:42px;height:42px;border:0;border-radius:50%;background:var(--c);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}.form button svg{width:20px;height:20px;fill:#fff}" +
    ".foot{font-size:11px;color:#6b7280;text-align:center;padding:0 10px 8px;background:#fff}" +
    "@media(max-width:480px){.panel{inset:0;width:100%;height:100%;max-height:none;border-radius:0}.launch{width:56px;height:56px}.tip{max-width:200px}.form{padding-bottom:max(10px,env(safe-area-inset-bottom))}}" +
    "@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}";

  function build() {
    host = document.createElement("div");
    host.id = "kkw-chatbot-root";
    document.body.appendChild(host);
    sh = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var c2 = shade(CFG.color, -18);
    sh.innerHTML = "<style>" + CSS + "</style>" +
      '<div class="wrap" style="--c:' + CFG.color + ";--c2:" + c2 + ";--a:" + CFG.accent + '">' +
      '<button class="launch" id="launch" aria-label="Open chat"><svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM7 9h10v2H7zm6 5H7v-2h6zm4-6H7V6h10z"/></svg><span class="dot" id="dot" hidden></span></button>' +
      '<div class="tip" id="tip" hidden><span id="tiptext"></span><button id="tipx" aria-label="Dismiss">&times;</button></div>' +
      '<section class="panel" id="panel" role="dialog" aria-label="College assistant">' +
      '<header class="head"><div class="logo">🎓</div><div class="ht"><b id="title">K. K. Wagh Polytechnic</b><small id="sub"></small></div>' +
      '<button class="hb" id="lang"></button><button class="hb" id="reset" title="">&#8635;</button><button class="hb" id="close" aria-label="Close">&times;</button></header>' +
      '<div class="msgs" id="msgs" aria-live="polite"></div>' +
      '<form class="form" id="form" autocomplete="off"><input id="in" type="text" maxlength="200" aria-label="Your question"><button type="submit" id="send"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button></form>' +
      '<div class="foot" id="foot"></div></section></div>';
    panel = q("#panel"); list = q("#msgs"); input = q("#in"); launcher = q("#launch"); tipEl = q("#tip");
    langBtn = q("#lang"); subEl = q("#sub"); footEl = q("#foot"); sendBtn = q("#send");

    launcher.addEventListener("click", function () { toggle(!state.open); });
    q("#close").addEventListener("click", function () { toggle(false); });
    q("#reset").addEventListener("click", function () { restart(); });
    langBtn.addEventListener("click", function () { state.lang = state.lang === "en" ? "mr" : "en"; restart(); });
    q("#tipx").addEventListener("click", function (e) { e.stopPropagation(); hideTip(); });
    tipEl.addEventListener("click", function () { toggle(true); });
    q("#form").addEventListener("submit", function (e) { e.preventDefault(); var v = input.value.trim(); if (v) { input.value = ""; userSays(v); } });
    sh.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.open) toggle(false); });
    list.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a") : null;
      if (a) emit("link", { href: a.href });
    });
  }
  function q(s) { return sh.querySelector(s); }
  function shade(hex, pct) {
    var n = parseInt(hex.replace("#", ""), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, f = function (v) { return Math.max(0, Math.min(255, Math.round(v + v * pct / 100))); };
    return "#" + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  function applyLang() {
    subEl.textContent = T("sub"); input.placeholder = T("ph"); footEl.textContent = T("foot");
    langBtn.textContent = T("lang"); langBtn.title = T("langTitle"); q("#reset").title = T("reset");
    q("#close").setAttribute("aria-label", T("close")); launcher.setAttribute("aria-label", T("open")); sendBtn.setAttribute("aria-label", T("send"));
    q("#tiptext").textContent = T("tip"); host.setAttribute("lang", state.lang === "mr" ? "mr" : "en");
  }

  /* ---- messages ---- */
  function clearSuggestions() {
    var n = list.querySelectorAll(".chips,.menu"), i;
    for (i = 0; i < n.length; i++) n[i].parentNode.removeChild(n[i]);
  }
  function renderMsg(m) {
    var row = el("div", "row " + m.who), col = el("div", "col"), bub = el("div", "bub " + m.who);
    if (m.who === "b") { row.appendChild(el("div", "av", "🎓")); bub.innerHTML = m.html; } else { bub.textContent = m.text; }
    col.appendChild(bub); col.appendChild(el("div", "ts", m.ts || ""));
    row.appendChild(col); list.appendChild(row);
    return row;
  }
  function renderSuggestions(m) {
    var wrap, i, b;
    if (m.menu) {
      wrap = el("div", "menu");
      MENU.forEach(function (id) {
        b = el("button", "", "<span>" + LABELS[id][2] + "</span>" + esc(label(id)));
        b.addEventListener("click", function () { chip(id); }); wrap.appendChild(b);
      });
      list.appendChild(wrap);
    }
    if (m.chips && m.chips.length) {
      wrap = el("div", "chips");
      m.chips.forEach(function (id) {
        b = el("button", "", esc(label(id)));
        b.addEventListener("click", function () { chip(id); }); wrap.appendChild(b);
      });
      list.appendChild(wrap);
    }
  }
  function addMsg(m, persist) {
    m.ts = m.ts || now();
    var row = renderMsg(m);
    if (m.who === "b") renderSuggestions(m);
    if (persist !== false) { state.msgs.push(m); save(); }
    // long answers: show the START of the reply; short ones: stick to the bottom
    if (m.who === "b" && row.offsetHeight + 70 > list.clientHeight) list.scrollTop = row.offsetTop - 10;
    else scrollDown();
  }
  function showTyping() {
    typingEl = el("div", "row b", '<div class="av">🎓</div><div class="bub b typing"><i></i><i></i><i></i></div>');
    list.appendChild(typingEl); scrollDown();
  }
  function hideTyping() { if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl); typingEl = null; }

  function botMessage(intent) {
    var a, id = intent.id, html, extraTxt;
    if (id === "contact" || id === "human") a = contactAnswer(state.lang);
    else a = (state.lang === "mr" && intent.mr) ? intent.mr : intent.en;
    html = fmt(a.t);
    extraTxt = CFG.extra[id];
    if (extraTxt) html += "<p>ℹ️ " + inline(extraTxt) + "</p>";
    if (a.l.length) {
      html += '<div class="links">' + a.l.map(function (x) {
        return '<a href="' + esc(url(x[2])) + '" target="_blank" rel="noopener">' + esc(state.lang === "mr" ? x[1] : x[0]) + "</a>";
      }).join("") + "</div>";
    }
    return { who: "b", html: html, chips: a.c, menu: id === "greet" || id === "menu" };
  }
  function fallbackMessage() {
    state.fails++;
    var html, t = state.fails >= 2 ? T("fallback2") : T("fallback");
    html = fmt(t);
    if (state.fails >= 2) { var c = contactAnswer(state.lang); html += fmt(c.t); }
    return { who: "b", html: html, chips: state.fails >= 2 ? ["menu", "reach"] : ["admission", "courses", "contact"], menu: false };
  }

  function reply(intent, userText) {
    clearSuggestions(); showTyping();
    var delay = 450 + Math.min(450, intent ? 150 : 0);
    setTimeout(function () {
      hideTyping();
      if (intent) { state.fails = 0; addMsg(botMessage(intent)); }
      else { emit("unanswered", { text: userText }); addMsg(fallbackMessage()); }
    }, delay);
  }
  function userSays(text) {
    clearSuggestions();
    if (/[\u0900-\u097f]/.test(text) && state.lang === "en") { state.lang = "mr"; applyLang(); save(); }
    addMsg({ who: "u", text: text });
    emit("question", { text: text });
    reply(matchIntent(text), text);
  }
  function chip(id) {
    clearSuggestions();
    addMsg({ who: "u", text: label(id) });
    emit("question", { text: label(id), via: "chip" });
    reply(byId(id) || byId("menu"), label(id));
  }

  /* ---- panel control ---- */
  function toggle(open) {
    state.open = open; panel.classList.toggle("open", open);
    q("#dot").hidden = true; hideTip();
    if (open) {
      emit("open", {});
      if (!state.msgs.length) startConversation();
      setTimeout(function () { scrollDown(); try { input.focus(); } catch (e) {} }, 60);
    }
    save();
  }
  function startConversation() {
    addMsg({ who: "b", html: fmt(T("welcome")), chips: [], menu: true });
  }
  function restart() {
    state.msgs = []; state.fails = 0; list.innerHTML = ""; applyLang(); startConversation(); save();
  }
  function hideTip() { tipEl.hidden = true; state.tipShown = true; }

  function init() {
    load(); build(); applyLang();
    if (state.msgs.length) {
      state.msgs.forEach(function (m, i) { renderMsg(m); if (i === state.msgs.length - 1 && m.who === "b") renderSuggestions(m); });
    }
    panel.classList.toggle("open", state.open);
    if (state.open) { if (!state.msgs.length) startConversation(); setTimeout(scrollDown, 60); }
    if (CFG.autoGreeting && !state.tipShown && !state.open) {
      setTimeout(function () { if (!state.open && !state.tipShown) { tipEl.hidden = false; q("#dot").hidden = false; } }, 4000);
    }
    // public API: window.KKWChatbot.open() / .close() / .ask("text")
    root.KKWChatbot = { open: function () { toggle(true); }, close: function () { toggle(false); }, ask: function (t) { toggle(true); userSays(String(t)); } };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
