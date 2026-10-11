"""
K. K. Wagh Polytechnic Chatbot - FastAPI Backend
Serves the chatbot frontend and handles chat API requests.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
import re

app = FastAPI(title="KK Wagh Polytechnic Chatbot")

# ======================================================================
# CONFIGURATION
# ======================================================================
BASE_URL = "https://poly.kkwagh.edu.in/"
PHONES = [["(0253) 2517005", "02532517005"], ["(0253) 2517006", "02532517006"]]
EMAILS = ["principal-poly@kkwagh.edu.in", "disp-poly@kkwagh.edu.in"]
ADDRESS = "Hirabai Haridas Vidyanagari, Old Mumbai Agra Road, Amrutdham, Panchavati, Nashik, Maharashtra - 422003"


# ======================================================================
# KNOWLEDGE BASE (ported from kkwagh-chatbot.js)
# ======================================================================
def make_link(en, mr, path):
    if re.match(r'^(https?:|tel:|mailto:)', path):
        full_url = path
    else:
        full_url = BASE_URL + path
    return {"en": en, "mr": mr, "url": full_url}


DEPTS = [
    {"id": "dept_computer", "name": "Computer Technology", "mr": "संगणक तंत्रज्ञान", "seats": 180, "nba": True, "page": "computer_dept.php",
     "kw": ["computer technology", "computer engineering", "computer dept", "computer department", "computer branch", "computer", "comp", "संगणक", "कॉम्प्युटर"]},
    {"id": "dept_it", "name": "Information Technology", "mr": "माहिती तंत्रज्ञान", "seats": 120, "nba": True, "page": "if_dept.php",
     "kw": ["information technology", "it department", "it dept", "it branch", "it engineering", "it course", "diploma in it", "if dept", "माहिती तंत्रज्ञान"]},
    {"id": "dept_aiml", "name": "Artificial Intelligence & Machine Learning", "mr": "आर्टिफिशियल इंटेलिजन्स आणि मशीन लर्निंग", "seats": 120, "nba": False, "page": "aiml_dept.php",
     "kw": ["artificial intelligence", "machine learning", "aiml", "ai ml", "ai and ml", "ai", "ml"]},
    {"id": "dept_mech", "name": "Mechanical Engineering", "mr": "यांत्रिकी अभियांत्रिकी", "seats": 120, "nba": True, "page": "mechanical_dept.php",
     "kw": ["mechanical", "mech", "यांत्रिकी", "मेकॅनिकल"]},
    {"id": "dept_ee", "name": "Electrical Engineering", "mr": "विद्युत अभियांत्रिकी", "seats": 120, "nba": True, "page": "ee_dept.php",
     "kw": ["electrical", "electric", "ee dept", "इलेक्ट्रिकल", "विद्युत"]},
    {"id": "dept_civil", "name": "Civil Engineering", "mr": "स्थापत्य अभियांत्रिकी", "seats": 60, "nba": True, "page": "civil_dept.php",
     "kw": ["civil", "सिव्हिल", "स्थापत्य"]},
    {"id": "dept_chem", "name": "Chemical Engineering", "mr": "रासायनिक अभियांत्रिकी", "seats": 60, "nba": True, "page": "ch1_dept.php",
     "kw": ["chemical", "chem eng", "केमिकल", "रासायनिक"]},
    {"id": "dept_adis", "name": "Advanced Diploma in Industrial Safety", "mr": "औद्योगिक सुरक्षा प्रगत पदविका", "seats": 30, "nba": False, "page": "adis_dept.php",
     "kw": ["industrial safety", "adis", "advanced diploma", "safety diploma", "औद्योगिक सुरक्षा"]},
    {"id": "dept_sh", "name": "Science and Humanities", "mr": "विज्ञान व मानव्यशास्त्र", "seats": 0, "nba": False, "page": "science.php",
     "kw": ["science and humanities", "humanities", "first year science", "applied science", "विज्ञान"]},
]

NBA_NOTE_EN = "Listed on the college website as NBA accredited (valid up to June 2026)."
NBA_NOTE_MR = "महाविद्यालयाच्या संकेतस्थळावर NBA मान्यताप्राप्त म्हणून नमूद (जून 2026 पर्यंत)."


def build_intents():
    intents = []

    def add(id, kw, en_text, en_links=None, en_chips=None, mr_text=None, mr_links=None, mr_chips=None):
        intents.append({
            "id": id, "kw": kw,
            "en": {"text": en_text, "links": en_links or [], "chips": en_chips or []},
            "mr": {"text": mr_text or en_text, "links": mr_links or en_links or [], "chips": mr_chips or en_chips or []}
        })

    # -- Greet --
    add("greet",
        ["hi", "hii", "hello", "hey", "namaste", "namaskar", "good morning", "good afternoon", "good evening", "नमस्कार", "नमस्ते", "हॅलो", "हेलो"],
        "Hello! 👋 I'm the virtual assistant of **K. K. Wagh Polytechnic, Nashik**.\nWhat would you like to know? Pick a topic or type your question.",
        mr_text="नमस्कार! 👋 मी **के. के. वाघ पॉलिटेक्निक, नाशिक** चा व्हर्च्युअल सहाय्यक आहे.\nआपल्याला काय जाणून घ्यायचे आहे? खालील विषय निवडा किंवा प्रश्न टाईप करा.")

    # -- Menu --
    add("menu",
        ["menu", "help", "options", "topics", "start", "what can you do", "मदत", "पर्याय", "मेनू"],
        "Here is what I can help you with. Tap a topic or type your question:",
        mr_text="मी खालील विषयांत मदत करू शकतो. विषय निवडा किंवा प्रश्न टाईप करा:")

    # -- Identity --
    add("identity",
        ["who are you", "your name", "are you a bot", "are you bot", "what are you", "तू कोण", "तुम्ही कोण"],
        "I'm an automated assistant for K. K. Wagh Polytechnic's website. I answer from the information published on the official site. For anything I can't answer, the college office is happy to help.",
        en_chips=["human", "menu"],
        mr_text="मी के. के. वाघ पॉलिटेक्निकच्या संकेतस्थळावरील स्वयंचलित सहाय्यक आहे. अधिकृत संकेतस्थळावरील माहितीवरून मी उत्तर देतो. इतर प्रश्नांसाठी कृपया महाविद्यालयाच्या कार्यालयाशी संपर्क करा.",
        mr_chips=["human", "menu"])

    # -- About --
    add("about",
        ["about", "history", "established", "founded", "affiliated", "affiliation", "approved", "society", "institute", "institutes", "campus", "आमच्याबद्दल", "संस्थेबद्दल", "महाविद्यालय", "कॉलेज", "इतिहास"],
        "**K. K. Wagh Polytechnic, Nashik** is run by K. K. Wagh Education Society.\n- Established in **1983** at Bhausaheb Nagar; moved in **1992** to the Hirabai Haridas Vidyanagari campus\n- Second shift started from the academic year **2008-09**\n- Affiliated to **MSBTE Mumbai**; approved by **AICTE New Delhi** and **DTE Mumbai**",
        en_links=[make_link("About us", "आमच्याबद्दल", "aboutinstitute.php"), make_link("Our institutes", "आमच्या संस्था", "ourinstitutes.php")],
        en_chips=["vision", "courses", "contact"],
        mr_text="**के. के. वाघ पॉलिटेक्निक, नाशिक** ही के. के. वाघ एज्युकेशन सोसायटीची संस्था आहे.\n- स्थापना **1983** मध्ये भाऊसाहेब नगर येथे; **1992** मध्ये हिराबाई हरिदास विद्यानगरी परिसरात स्थलांतर\n- शैक्षणिक वर्ष **2008-09** पासून दुसरी शिफ्ट सुरू\n- **MSBTE मुंबई** शी संलग्न; **AICTE नवी दिल्ली** व **DTE मुंबई** यांची मान्यता",
        mr_chips=["vision", "courses", "contact"])

    # -- Vision --
    add("vision",
        ["vision", "mission", "दृष्टी", "ध्येय"],
        "**Vision:** Transform the students into competent diploma engineers by offering quality technical education and life skills.\n\n**Mission:**\n- Impart quality technical education and industry-relevant skills to diploma students\n- Foster innovative thinking, creativity, problem-solving skills and an entrepreneurial attitude\n- Instill a sustainable mindset, ethics and learning skills to support the growth of industry, society and the nation",
        en_links=[make_link("About us", "आमच्याबद्दल", "aboutinstitute.php")],
        en_chips=["about", "courses"],
        mr_text="**दृष्टी:** दर्जेदार तांत्रिक शिक्षण व जीवन कौशल्ये देऊन विद्यार्थ्यांना सक्षम पदविका अभियंता बनविणे.\n\n**ध्येय:**\n- उद्योगाभिमुख दर्जेदार तांत्रिक शिक्षण देणे\n- नावीन्यपूर्ण विचार, सर्जनशीलता, समस्या सोडविण्याचे कौशल्य व उद्योजकीय वृत्ती वाढविणे\n- शाश्वत विचार, नैतिकता व शिकण्याची कौशल्ये रुजविणे",
        mr_chips=["about", "courses"])

    # -- Principal --
    add("principal",
        ["principal", "principal desk", "head of institute", "प्राचार्य"],
        "You can read the Principal's message here. For direct communication, email **principal-poly@kkwagh.edu.in**.",
        en_links=[make_link("Principal's desk", "प्राचार्यांचा संदेश", "principal_desk.php"), make_link("Contact us", "संपर्क", "contactus.php")],
        en_chips=["contact", "about"],
        mr_text="प्राचार्यांचा संदेश खालील पानावर वाचता येईल. थेट संपर्कासाठी **principal-poly@kkwagh.edu.in** वर ईमेल करा.",
        mr_chips=["contact", "about"])

    # -- Courses --
    add("courses",
        ["course", "courses", "branch", "branches", "diploma", "program", "programme", "programs", "seats", "intake", "stream", "total seats", "अभ्यासक्रम", "शाखा", "जागा", "कोर्स", "पदविका"],
        "**Courses and intake (seats):**\n- Mechanical Engineering - 120\n- Electrical Engineering - 120\n- Computer Technology - 180\n- Information Technology - 120\n- Artificial Intelligence & Machine Learning - 120\n- Chemical Engineering - 60\n- Civil Engineering - 60\n- Advanced Diploma in Industrial Safety - 30\n\n**Total intake: 810 seats.** Tap a department below for details.",
        en_links=[make_link("Courses page", "अभ्यासक्रम पान", "coursesoffered.php")],
        en_chips=["dept_computer", "dept_it", "dept_aiml", "dept_mech", "dept_ee", "admission"],
        mr_text="**अभ्यासक्रम व प्रवेश क्षमता (जागा):**\n- मेकॅनिकल इंजिनिअरिंग - 120\n- इलेक्ट्रिकल इंजिनिअरिंग - 120\n- कॉम्प्युटर टेक्नॉलॉजी - 180\n- इन्फॉर्मेशन टेक्नॉलॉजी - 120\n- आर्टिफिशियल इंटेलिजन्स व मशीन लर्निंग - 120\n- केमिकल इंजिनिअरिंग - 60\n- सिव्हिल इंजिनिअरिंग - 60\n- अॅडव्हान्स्ड डिप्लोमा इन इंडस्ट्रियल सेफ्टी - 30\n\n**एकूण प्रवेश क्षमता: 810 जागा.** अधिक माहितीसाठी खालील विभाग निवडा.",
        mr_chips=["dept_computer", "dept_it", "dept_aiml", "dept_mech", "dept_ee", "admission"])

    # -- NBA --
    add("nba",
        ["nba", "accredit", "accredited", "accreditation", "मानांकन", "मान्यताप्राप्त"],
        "On the college website, these courses are marked as **NBA accredited (valid up to June 2026)**: Mechanical, Electrical, Computer Technology, Information Technology, Chemical and Civil Engineering.\nAs that date has passed, please confirm the current status with the college office.",
        en_links=[make_link("Courses page", "अभ्यासक्रम पान", "coursesoffered.php")],
        en_chips=["contact", "courses"],
        mr_text="महाविद्यालयाच्या संकेतस्थळावर खालील अभ्यासक्रम **NBA मान्यताप्राप्त (जून 2026 पर्यंत)** म्हणून नमूद आहेत: मेकॅनिकल, इलेक्ट्रिकल, कॉम्प्युटर टेक्नॉलॉजी, इन्फॉर्मेशन टेक्नॉलॉजी, केमिकल व सिव्हिल.\nही तारीख उलटून गेल्याने सध्याची स्थिती कार्यालयाकडून कृपया खात्री करून घ्या.",
        mr_chips=["contact", "courses"])

    # -- Admission --
    add("admission",
        ["admission", "admissions", "admit", "apply", "application", "cap", "procedure", "process", "eligibility", "eligible", "prospectus", "merit list", "merit", "vacant", "last date", "admission schedule", "how to join", "dte", "प्रवेश", "अर्ज", "गुणवत्ता यादी", "प्रवेश पुस्तिका"],
        "Admissions to the first year Diploma are through the **DTE Maharashtra CAP (Centralized Admission Process)**.\nThese official documents will help you:",
        en_links=[
            make_link("Prospectus 2026-27", "प्रवेश पुस्तिका 2026-27", "2026-27/Prospectus-2026-27.pdf"),
            make_link("CAP admission steps", "CAP प्रवेश प्रक्रिया", "2026-27/CAP Steps Details.pdf"),
            make_link("FY admission schedule & vacant seats", "प्रवेश वेळापत्रक व रिक्त जागा", "2026-27/ACAPFY.pdf"),
            make_link("Final merit list 2026-27", "अंतिम गुणवत्ता यादी 2026-27", "2026-27/meritlist1.pdf"),
            make_link("DTE information brochure", "DTE माहिती पुस्तिका", "2026-27/Diploma Information Brochure.pdf"),
            make_link("DTE rules for admissions", "DTE प्रवेश नियम", "2025-26/dterules.pdf"),
            make_link("DTE Maharashtra website", "DTE महाराष्ट्र संकेतस्थळ", "https://dte.maharashtra.gov.in/"),
        ],
        en_chips=["docs", "courses", "fees", "scholar"],
        mr_text="पहिल्या वर्षाच्या पदविका प्रवेशासाठी **DTE महाराष्ट्र केंद्रीय प्रवेश प्रक्रिया (CAP)** राबविली जाते.\nखालील अधिकृत कागदपत्रे उपयुक्त ठरतील:",
        mr_chips=["docs", "courses", "fees", "scholar"])

    # -- Documents --
    add("docs",
        ["document", "documents", "certificate", "certificates", "required", "papers", "marksheet", "mark sheet", "domicile", "caste", "income", "ews", "creamy", "non creamy", "what to bring", "कागदपत्र", "कागदपत्रे", "प्रमाणपत्र", "दाखला", "दस्तावेज"],
        "**Documents required for First Year Diploma admission:**\n- SSC / HSC / ITI mark sheet\n- Nationality certificate / Birth certificate / Indian on LC\n- Domicile certificate\n- Latest School Leaving Certificate\n- Income certificate of 2025-26 (income limit up to Rs. 8.0 lakh)\n- Caste certificate - for VJ/DT-NT, OBC, SBC, SEBC and SC/ST\n- EWS eligibility certificate - for EWS category\n- Non-creamy layer certificate valid up to 31 March 2027 - for VJ/DT-NT, OBC, SBC, SEBC\n- Mobile number of student/parent and email ID of student\n\nRequirements depend on your category. See the full table for details.",
        en_links=[make_link("Full documents table", "संपूर्ण कागदपत्र तक्ता", "documents.php")],
        en_chips=["admission", "scholar", "contact"],
        mr_text="**प्रथम वर्ष पदविका प्रवेशासाठी आवश्यक कागदपत्रे:**\n- SSC / HSC / ITI गुणपत्रिका\n- राष्ट्रीयत्व प्रमाणपत्र / जन्म दाखला / LC वर 'भारतीय' नोंद\n- अधिवास (डोमिसाईल) प्रमाणपत्र\n- अलीकडील शाळा सोडल्याचा दाखला\n- 2025-26 चे उत्पन्न प्रमाणपत्र (उत्पन्न मर्यादा 8.0 लाखांपर्यंत)\n- जात प्रमाणपत्र - VJ/DT-NT, OBC, SBC, SEBC व SC/ST साठी\n- EWS पात्रता प्रमाणपत्र - EWS प्रवर्गासाठी\n- नॉन-क्रीमी लेयर प्रमाणपत्र (31 मार्च 2027 पर्यंत वैध) - VJ/DT-NT, OBC, SBC, SEBC साठी\n- विद्यार्थी/पालकांचा मोबाईल क्रमांक व विद्यार्थ्याचा ईमेल आयडी\n\nआवश्यक कागदपत्रे प्रवर्गानुसार बदलतात. तपशीलासाठी संपूर्ण तक्ता पहा.",
        mr_chips=["admission", "scholar", "contact"])

    # -- Fees --
    add("fees",
        ["fee", "fees", "fee structure", "payment", "pay", "sbi", "tuition", "cost", "charges", "how much", "शुल्क", "फी", "फीस"],
        "Fee details for the current year are published in the Prospectus and on the Fee Regulating Authority page. Fees can be paid online through **SBI Collect**.\nFor the exact amount for your course and category, please confirm with the college office.",
        en_links=[
            make_link("Prospectus 2026-27", "प्रवेश पुस्तिका 2026-27", "2026-27/Prospectus-2026-27.pdf"),
            make_link("Fee Regulating Authority", "शुल्क नियामक प्राधिकरण", "fra.php"),
            make_link("SBI Collect (pay online)", "SBI Collect (ऑनलाइन भरणा)", "https://onlinesbi.sbi.bank.in/sbicollect/"),
        ],
        en_chips=["scholar", "admission", "contact"],
        mr_text="चालू वर्षाच्या शुल्काची माहिती प्रवेश पुस्तिकेत व शुल्क नियामक प्राधिकरणाच्या पानावर उपलब्ध आहे. शुल्क **SBI Collect** द्वारे ऑनलाइन भरता येते.\nआपल्या अभ्यासक्रम व प्रवर्गानुसार अचूक रकमेसाठी कृपया कार्यालयाशी संपर्क करा.",
        mr_chips=["scholar", "admission", "contact"])

    # -- Scholarship --
    add("scholar",
        ["scholarship", "scholarships", "freeship", "mahadbt", "tfws", "financial aid", "शिष्यवृत्ती", "स्कॉलरशिप", "छात्रवृत्ति"],
        "Information about scholarships and the list of documents needed is available below. Applications are made through the **MahaDBT portal**.",
        en_links=[
            make_link("Scholarship page", "शिष्यवृत्ती पान", "scholarship.php"),
            make_link("Scholarship documents list", "शिष्यवृत्ती कागदपत्र यादी", "2026-27/Scholarship.pdf"),
            make_link("MahaDBT portal", "MahaDBT पोर्टल", "https://mahadbt.maharashtra.gov.in/"),
        ],
        en_chips=["docs", "fees", "contact"],
        mr_text="शिष्यवृत्तीची माहिती व आवश्यक कागदपत्रांची यादी खाली उपलब्ध आहे. अर्ज **MahaDBT पोर्टल** द्वारे करावा.",
        mr_chips=["docs", "fees", "contact"])

    # -- Placement --
    add("placement",
        ["placement", "placements", "job", "jobs", "recruit", "recruitment", "recruiter", "career", "careers", "training", "package", "companies", "salary", "प्लेसमेंट", "नोकरी", "नियुक्ती", "रोजगार"],
        "The college has a **Training & Placement** cell. You can see placement data, career opportunities and training details here:",
        en_links=[
            make_link("Training & Placement", "प्रशिक्षण व नियुक्ती", "trainingplacement.php"),
            make_link("Placement data (PDF)", "प्लेसमेंट माहिती (PDF)", "NBA/Placement.pdf"),
            make_link("Career opportunities", "करिअर संधी", "career.php"),
        ],
        en_chips=["courses", "contact"],
        mr_text="महाविद्यालयात **प्रशिक्षण व नियुक्ती (Training & Placement)** विभाग आहे. प्लेसमेंट माहिती, करिअर संधी व प्रशिक्षणाचा तपशील येथे पहा:",
        mr_chips=["courses", "contact"])

    # -- Library --
    add("library",
        ["library", "books", "book", "journal", "journals", "magazine", "magazines", "e-resource", "e-resources", "online library", "ग्रंथालय", "लायब्ररी", "पुस्तकालय", "पुस्तके"],
        "The college library offers books, journals & magazines and online e-resources. Library rules, staff and facilities are listed on the library pages.",
        en_links=[
            make_link("Library", "ग्रंथालय", "library.php"),
            make_link("Books", "पुस्तके", "books.php"),
            make_link("Journals & magazines", "नियतकालिके", "libjm.php"),
            make_link("Online e-resources", "ऑनलाइन संसाधने", "onlinelib.php"),
            make_link("Library rules", "ग्रंथालय नियम", "librules.php"),
        ],
        en_chips=["facilities", "contact"],
        mr_text="महाविद्यालयाच्या ग्रंथालयात पुस्तके, नियतकालिके व ऑनलाइन ई-संसाधने उपलब्ध आहेत. ग्रंथालयाचे नियम, कर्मचारी व सुविधा संबंधित पानांवर आहेत.",
        mr_chips=["facilities", "contact"])

    # -- Hostel --
    add("hostel",
        ["hostel", "mess", "accommodation", "stay", "boarding", "वसतिगृह", "हॉस्टेल", "मेस", "छात्रावास", "राहण्याची"],
        "The college provides **Hostel and Mess** facilities. For seat availability, fees and rules, please see the hostel page or contact the office.",
        en_links=[make_link("Hostel & Mess", "वसतिगृह व मेस", "hostelmess.php"), make_link("Contact us", "संपर्क", "contactus.php")],
        en_chips=["facilities", "bus", "contact"],
        mr_text="महाविद्यालयात **वसतिगृह व मेस** सुविधा उपलब्ध आहे. जागा, शुल्क व नियमांसाठी वसतिगृह पान पहा किंवा कार्यालयाशी संपर्क करा.",
        mr_chips=["facilities", "bus", "contact"])

    # -- Bus --
    add("bus",
        ["bus", "buses", "transport", "transportation", "बस", "वाहतूक", "परिवहन"],
        "The college has a **bus facility**. Please see the page for routes and details.",
        en_links=[make_link("Bus facility", "बस सुविधा", "bus.php")],
        en_chips=["facilities", "reach"],
        mr_text="महाविद्यालयात **बस सुविधा** उपलब्ध आहे. मार्ग व तपशीलासाठी पान पहा.",
        mr_chips=["facilities", "reach"])

    # -- Facilities --
    add("facilities",
        ["facilities", "campus facility", "canteen", "gym", "gymnasium", "sports", "bank", "medical", "health", "counselling", "counseling", "amenities", "infrastructure", "सुविधा", "कॅन्टीन", "क्रीडा", "व्यायामशाळा", "समुपदेशन"],
        "**Campus facilities** at K. K. Wagh Polytechnic:",
        en_links=[
            make_link("Library", "ग्रंथालय", "library.php"),
            make_link("Hostel & Mess", "वसतिगृह व मेस", "hostelmess.php"),
            make_link("Bus", "बस", "bus.php"),
            make_link("Canteen", "कॅन्टीन", "canteen.php"),
            make_link("Sports & Gymnasium", "क्रीडा व व्यायामशाळा", "gym.php"),
            make_link("Medical", "वैद्यकीय", "medical.php"),
            make_link("Bank", "बँक", "bank.php"),
            make_link("Counselling", "समुपदेशन", "Counselling.php"),
        ],
        en_chips=["hostel", "library", "bus"],
        mr_text="**के. के. वाघ पॉलिटेक्निकमधील परिसर सुविधा:**",
        mr_chips=["hostel", "library", "bus"])

    # -- Contact --
    add("contact",
        ["contact", "phone", "call", "email", "mail", "address", "number", "get in touch", "telephone", "संपर्क", "फोन", "ईमेल", "पत्ता", "क्रमांक"],
        "__CONTACT__", en_chips=["reach", "admission", "timings"],
        mr_text="__CONTACT__", mr_chips=["reach", "admission", "timings"])

    # -- Human --
    add("human",
        ["human", "agent", "talk to", "speak to", "call me", "real person", "representative", "office staff", "कर्मचारी"],
        "__CONTACT__", en_chips=["reach", "admission", "timings"],
        mr_text="__CONTACT__", mr_chips=["reach", "admission", "timings"])

    # -- Reach --
    add("reach",
        ["reach", "location", "directions", "route", "map", "how to come", "how to get", "where is", "लोकेशन", "कसे पोहोचायचे", "कुठे आहे"],
        f"**Our address:**\n{ADDRESS}\n\nThe 'How to reach' page has the route and map.",
        en_links=[
            make_link("How to reach us", "आमच्यापर्यंत कसे पोहोचाल", "howtoreach.php"),
            make_link("Open in Google Maps", "Google Maps मध्ये उघडा", "https://www.google.com/maps/search/?api=1&query=K.+K.+Wagh+Polytechnic+Nashik"),
        ],
        en_chips=["bus", "contact"],
        mr_text="**आमचा पत्ता:**\nके. के. वाघ पॉलिटेक्निक, हिराबाई हरिदास विद्यानगरी, जुना मुंबई-आगरा रोड, अमृतधाम, पंचवटी, नाशिक - 422003\n\n'कसे पोहोचाल' पानावर मार्ग व नकाशा आहे.",
        mr_chips=["bus", "contact"])

    # -- Timings --
    add("timings",
        ["timing", "timings", "office hours", "office time", "college time", "working hours", "working days", "open today", "वेळ", "कार्यालयीन वेळ"],
        "Office and college timings are not published on the website, so please call the office to confirm before visiting.",
        en_links=[make_link("Contact us", "संपर्क", "contactus.php")],
        en_chips=["contact", "reach"],
        mr_text="कार्यालय व महाविद्यालयाच्या वेळा संकेतस्थळावर दिलेल्या नाहीत. भेट देण्यापूर्वी कृपया कार्यालयात फोन करून खात्री करा.",
        mr_chips=["contact", "reach"])

    # -- Faculty --
    add("faculty",
        ["faculty", "teacher", "teachers", "staff", "professor", "hod", "faculty list", "शिक्षक", "प्राध्यापक", "फॅकल्टी"],
        "The faculty list for 2025-26 and faculty details are here:",
        en_links=[
            make_link("Faculty list 2025-26 (PDF)", "प्राध्यापक यादी 2025-26 (PDF)", "NBA/Faculty List 2025-26.pdf"),
            make_link("Faculty page", "प्राध्यापक पान", "faculty.php"),
        ],
        en_chips=["courses", "contact"],
        mr_text="2025-26 ची प्राध्यापक यादी व माहिती येथे आहे:",
        mr_chips=["courses", "contact"])

    # -- Calendar --
    add("calendar",
        ["calendar", "exam", "exams", "timetable", "time table", "holiday", "holidays", "academic calendar", "परीक्षा", "वेळापत्रक", "दिनदर्शिका"],
        "Academic calendars are available below. Exam notices and timetables are published by **MSBTE**.",
        en_links=[
            make_link("MSBTE academic calendar 2025-26", "MSBTE शैक्षणिक दिनदर्शिका 2025-26", "2025-26/AcademicCalendar2025-26.pdf"),
            make_link("Institute calendar 2025-26", "संस्था दिनदर्शिका 2025-26", "2025-26/ac25-26.pdf"),
            make_link("MSBTE website", "MSBTE संकेतस्थळ", "https://msbte.org.in/"),
        ],
        en_chips=["erp", "contact"],
        mr_text="शैक्षणिक दिनदर्शिका खाली उपलब्ध आहे. परीक्षेच्या सूचना व वेळापत्रक **MSBTE** प्रसिद्ध करते.",
        mr_chips=["erp", "contact"])

    # -- ERP --
    add("erp",
        ["erp", "login", "portal", "attendance", "result", "results", "student login", "निकाल", "लॉगिन"],
        "Students can log in to the college **ERP portal**. Official exam results are published by **MSBTE**.",
        en_links=[
            make_link("ERP login", "ERP लॉगिन", "https://erp.kkwagh.edu.in/"),
            make_link("MSBTE website", "MSBTE संकेतस्थळ", "https://msbte.org.in/"),
        ],
        en_chips=["calendar", "contact"],
        mr_text="विद्यार्थी महाविद्यालयाच्या **ERP पोर्टल** वर लॉगिन करू शकतात. अधिकृत परीक्षा निकाल **MSBTE** प्रसिद्ध करते.",
        mr_chips=["calendar", "contact"])

    # -- Safety --
    add("safety",
        ["ragging", "anti ragging", "complaint", "grievance", "harassment", "vishakha", "sc/st", "redressal", "ummeed", "manodarpan", "रॅगिंग", "तक्रार"],
        "The college has committees and cells for student safety and support:",
        en_links=[
            make_link("Anti-Ragging", "रॅगिंग प्रतिबंध", "antiragging.php"),
            make_link("Grievance Redressal Cell", "तक्रार निवारण कक्ष", "grievanceredressal.php"),
            make_link("Internal Complaint Committee", "अंतर्गत तक्रार समिती", "internalcomplaints_info.php"),
            make_link("Vishakha Committee", "विशाखा समिती", "vishakhacommittee.php"),
            make_link("SC/ST Cell", "SC/ST कक्ष", "scstcell.php"),
            make_link("UMMEED & MANODARPAN", "उम्मीद व मनोदर्पण", "umeed.php"),
        ],
        en_chips=["human", "contact"],
        mr_text="विद्यार्थ्यांच्या सुरक्षेसाठी व सहाय्यासाठी महाविद्यालयात खालील समित्या/कक्ष आहेत:",
        mr_chips=["human", "contact"])

    # -- Alumni --
    add("alumni",
        ["alumni", "alumnus", "old student", "passout", "माजी विद्यार्थी", "अल्युमनी"],
        "Former students can register with the alumni network here:",
        en_links=[
            make_link("Register as Alumni", "माजी विद्यार्थी नोंदणी", "https://www.almashines.com/kkwagh/account?cid=63"),
            make_link("Alumni Association certificate", "अल्युमनी असोसिएशन प्रमाणपत्र", "insttpdf/Alumni_Reg.pdf"),
        ],
        en_chips=["contact"],
        mr_text="माजी विद्यार्थी येथे अल्युमनी नेटवर्कमध्ये नोंदणी करू शकतात:",
        mr_chips=["contact"])

    # -- Disclosure --
    add("disclosure",
        ["disclosure", "mandatory", "aicte eoa", "eoa", "governing body", "board", "board of directors", "chairman", "msbte affiliation", "service rules", "अनिवार्य माहिती"],
        "Official disclosures and governance documents:",
        en_links=[
            make_link("Mandatory disclosure", "अनिवार्य माहिती", "mandatorydisclosure.php"),
            make_link("AICTE EOA", "AICTE EOA", "aicteeoa.php"),
            make_link("MSBTE affiliation", "MSBTE संलग्नता", "msbteaff.php"),
            make_link("Governing body", "प्रशासकीय मंडळ", "governingbody.php"),
            make_link("Board of Directors", "संचालक मंडळ", "board_of_directors.php"),
            make_link("Chairman's message", "अध्यक्षांचा संदेश", "president_msg.php"),
        ],
        en_chips=["about", "contact"],
        mr_text="अधिकृत माहिती व प्रशासकीय कागदपत्रे:",
        mr_chips=["about", "contact"])

    # -- Achievements --
    add("achievements",
        ["achievement", "achievements", "award", "awards", "record", "world record", "winners", "nasa", "sih", "recognition", "यश", "पुरस्कार"],
        "**A few highlights from the college website:**\n- An alumna set a **Genius Book of World Records** entry for the longest lecture on women entrepreneurship (540 minutes)\n- An alumna was part of a team that won an award at NASA's Human Exploration Rover Challenge\n- Electrical Engineering department students won State Level MSBTE project competitions\n- The Chemical Engineering department organised an MSBTE-sponsored state-level technical paper presentation competition",
        en_links=[make_link("Media news", "माध्यम बातम्या", "media.php")],
        en_chips=["about", "courses"],
        mr_text="**संकेतस्थळावरील काही ठळक बाबी:**\n- माजी विद्यार्थिनीची महिला उद्योजकतेवर सलग 540 मिनिटांच्या व्याख्यानासाठी **Genius Book of World Records** मध्ये नोंद\n- माजी विद्यार्थिनी NASA च्या Human Exploration Rover Challenge मध्ये पुरस्कारप्राप्त संघात सहभागी\n- इलेक्ट्रिकल इंजिनिअरिंग विभागाचे विद्यार्थी राज्यस्तरीय MSBTE प्रकल्प स्पर्धेचे विजेते\n- केमिकल इंजिनिअरिंग विभागाने MSBTE प्रायोजित राज्यस्तरीय तांत्रिक शोधनिबंध सादरीकरण स्पर्धा आयोजित केली",
        mr_chips=["about", "courses"])

    # -- Media --
    add("media",
        ["news", "media", "events", "event", "youtube", "video", "videos", "notice", "notices", "latest news", "बातम्या", "कार्यक्रम"],
        "Latest news and videos:",
        en_links=[
            make_link("Media news", "माध्यम बातम्या", "media.php"),
            make_link("Official YouTube channel", "अधिकृत YouTube चॅनेल", "https://www.youtube.com/channel/UC9m-8o7d34-tmIg_a2vuuDQ"),
        ],
        en_chips=["admission", "calendar"],
        mr_text="ताज्या बातम्या व व्हिडिओ:",
        mr_chips=["admission", "calendar"])

    # -- FAQ --
    add("faq",
        ["faq", "faqs", "frequently asked"],
        "Frequently asked questions are collected on this page:",
        en_links=[make_link("FAQ", "वारंवार विचारले जाणारे प्रश्न", "faq.php")],
        en_chips=["admission", "contact"],
        mr_text="वारंवार विचारले जाणारे प्रश्न या पानावर आहेत:",
        mr_chips=["admission", "contact"])

    # -- Thanks --
    add("thanks",
        ["thanks", "thank you", "thankyou", "thx", "great", "awesome", "धन्यवाद", "आभार", "शुक्रिया"],
        "You're welcome! 😊 Is there anything else I can help you with?",
        en_chips=["menu", "contact"],
        mr_text="आपले स्वागत आहे! 😊 आणखी काही मदत हवी आहे का?",
        mr_chips=["menu", "contact"])

    # -- Bye --
    add("bye",
        ["bye", "goodbye", "see you", "ok bye", "alvida", "निरोप"],
        "Goodbye! 👋 Best wishes from K. K. Wagh Polytechnic. Come back anytime.",
        mr_text="निरोप! 👋 के. के. वाघ पॉलिटेक्निकतर्फे शुभेच्छा. केव्हाही परत या.")

    # -- Department intents --
    for d in DEPTS:
        seats_en = f"Intake: **{d['seats']} seats**." if d['seats'] else "This department teaches the first-year science and humanities subjects."
        seats_mr = f"प्रवेश क्षमता: **{d['seats']} जागा**." if d['seats'] else "हा विभाग प्रथम वर्षाचे विज्ञान व मानव्यशास्त्र विषय शिकवतो."
        nba_en = f"\n{NBA_NOTE_EN}" if d['nba'] else ""
        nba_mr = f"\n{NBA_NOTE_MR}" if d['nba'] else ""
        add(d['id'], d['kw'],
            f"**{d['name']}**\n{seats_en}{nba_en}",
            en_links=[
                make_link(f"{d['name']} department", f"{d['mr']} विभाग", d['page']),
                make_link("All courses", "सर्व अभ्यासक्रम", "coursesoffered.php"),
            ],
            en_chips=["admission", "docs", "courses"],
            mr_text=f"**{d['mr']}**\n{seats_mr}{nba_mr}",
            mr_chips=["admission", "docs", "courses"])

    return intents


INTENTS = build_intents()


# ======================================================================
# MATCHING ENGINE (ported from JS)
# ======================================================================
STOP_LATIN = re.compile(r'^[a-z0-9 /]+$')

def normalize(s: str) -> str:
    s = s.lower().replace("&", " and ")
    s = re.sub(r'[^a-z0-9\u0900-\u097f/ ]+', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return f" {s} "


def levenshtein(a: str, b: str) -> int:
    m, n = len(a), len(b)
    d = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        d[i][0] = i
    for j in range(n + 1):
        d[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            c = 0 if a[i-1] == b[j-1] else 1
            d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + c)
    return d[m][n]


def match_intent(query: str):
    t = normalize(query)
    tokens = t.strip().split(" ")

    # special case for "it"
    if t.strip() == "it":
        for intent in INTENTS:
            if intent["id"] == "dept_it":
                return intent
        return None

    best = None
    top_score = 0

    for intent in INTENTS:
        score = 0
        for kw in intent["kw"]:
            hit = False
            w = len(kw)
            is_latin = bool(STOP_LATIN.match(kw))
            is_multi = " " in kw

            if is_latin and not is_multi and len(kw) <= 4:
                hit = f" {kw} " in t
            elif kw in t:
                hit = True
            elif is_latin and not is_multi and len(kw) >= 5:
                for tok in tokens:
                    if len(tok) >= 4 and abs(len(tok) - len(kw)) <= 2:
                        threshold = 2 if len(kw) >= 8 else 1
                        if levenshtein(tok, kw) <= threshold:
                            hit = True
                            w = len(kw) - 1
                            break
            if hit:
                score += w
        if score > top_score:
            top_score = score
            best = intent

    return best


def get_contact_answer(lang: str) -> dict:
    ph = " | ".join([f"[{p[0]}](tel:{p[1]})" for p in PHONES])
    em = "\n".join([f"- [{e}](mailto:{e})" for e in EMAILS])
    if lang == "mr":
        text = f"**के. के. वाघ पॉलिटेक्निक, नाशिक**\n{ADDRESS}\n\n📞 {ph}\n✉️ ईमेल:\n{em}"
    else:
        text = f"**K. K. Wagh Polytechnic, Nashik**\n{ADDRESS}\n\n📞 {ph}\n✉️ Email:\n{em}"
    return {
        "text": text,
        "links": [
            make_link("Contact page", "संपर्क पान", "contactus.php"),
            make_link("How to reach us", "कसे पोहोचाल", "howtoreach.php"),
        ],
        "chips": ["reach", "admission", "timings"]
    }


# ======================================================================
# CHIP LABELS
# ======================================================================
LABELS = {
    "admission": {"en": "Admission process", "mr": "प्रवेश प्रक्रिया", "emoji": "📝"},
    "courses": {"en": "Courses & seats", "mr": "अभ्यासक्रम व जागा", "emoji": "🎓"},
    "docs": {"en": "Documents required", "mr": "आवश्यक कागदपत्रे", "emoji": "📄"},
    "fees": {"en": "Fees", "mr": "शुल्क", "emoji": "💰"},
    "scholar": {"en": "Scholarship", "mr": "शिष्यवृत्ती", "emoji": "🏅"},
    "placement": {"en": "Placement", "mr": "प्लेसमेंट", "emoji": "💼"},
    "facilities": {"en": "Campus facilities", "mr": "परिसर सुविधा", "emoji": "🏫"},
    "contact": {"en": "Contact us", "mr": "संपर्क", "emoji": "📞"},
    "hostel": {"en": "Hostel & mess", "mr": "वसतिगृह व मेस", "emoji": "🛏️"},
    "library": {"en": "Library", "mr": "ग्रंथालय", "emoji": "📚"},
    "bus": {"en": "Bus facility", "mr": "बस सुविधा", "emoji": "🚌"},
    "about": {"en": "About the college", "mr": "महाविद्यालयाबद्दल", "emoji": "ℹ️"},
    "vision": {"en": "Vision & mission", "mr": "दृष्टी व ध्येय", "emoji": "🎯"},
    "reach": {"en": "How to reach", "mr": "कसे पोहोचाल", "emoji": "📍"},
    "timings": {"en": "Office timings", "mr": "कार्यालयीन वेळ", "emoji": "🕘"},
    "human": {"en": "Talk to the office", "mr": "कार्यालयाशी बोला", "emoji": "🙋"},
    "menu": {"en": "Main menu", "mr": "मुख्य मेनू", "emoji": "☰"},
    "calendar": {"en": "Academic calendar", "mr": "शैक्षणिक दिनदर्शिका", "emoji": "🗓️"},
    "erp": {"en": "ERP login", "mr": "ERP लॉगिन", "emoji": "🔐"},
}
for d in DEPTS:
    LABELS[d["id"]] = {"en": d["name"], "mr": d["mr"], "emoji": "🏷️"}

MENU_IDS = ["admission", "courses", "docs", "fees", "scholar", "placement", "facilities", "contact"]


# ======================================================================
# API MODELS
# ======================================================================
class ChatRequest(BaseModel):
    message: str
    lang: str = "en"


class ChatResponse(BaseModel):
    intent_id: str | None = None
    text: str
    links: list = []
    chips: list = []
    show_menu: bool = False
    menu_items: list = []
    labels: dict = {}
    is_fallback: bool = False


# ======================================================================
# API ENDPOINTS
# ======================================================================
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    lang = req.lang
    message = req.message.strip()

    # Auto-detect Marathi
    if re.search(r'[\u0900-\u097f]', message) and lang == "en":
        lang = "mr"

    intent = match_intent(message)

    if intent:
        iid = intent["id"]
        # Contact / Human special case
        if iid in ("contact", "human"):
            answer = get_contact_answer(lang)
        else:
            answer = intent["mr"] if lang == "mr" else intent["en"]
            # Replace __CONTACT__ placeholder
            if answer["text"] == "__CONTACT__":
                answer = get_contact_answer(lang)

        show_menu = iid in ("greet", "menu")
        menu_items = []
        if show_menu:
            for mid in MENU_IDS:
                lb = LABELS.get(mid, {})
                menu_items.append({
                    "id": mid,
                    "label": lb.get("mr" if lang == "mr" else "en", mid),
                    "emoji": lb.get("emoji", "")
                })

        # Build chip labels
        chip_labels = {}
        for cid in answer.get("chips", []):
            lb = LABELS.get(cid, {})
            chip_labels[cid] = lb.get("mr" if lang == "mr" else "en", cid)

        # Link labels based on language
        links = []
        for lnk in answer.get("links", []):
            links.append({
                "label": lnk.get("mr" if lang == "mr" else "en", ""),
                "url": lnk.get("url", "")
            })

        return ChatResponse(
            intent_id=iid,
            text=answer["text"],
            links=links,
            chips=answer.get("chips", []),
            show_menu=show_menu,
            menu_items=menu_items,
            labels=chip_labels,
            is_fallback=False
        )
    else:
        # Fallback
        if lang == "mr":
            text = "क्षमस्व, मला याचे उत्तर सापडले नाही. कृपया **प्रवेश, अभ्यासक्रम, कागदपत्रे, शुल्क, शिष्यवृत्ती, प्लेसमेंट, वसतिगृह** किंवा **संपर्क** याबद्दल विचारा."
        else:
            text = "Sorry, I couldn't find an answer to that. Try asking about **admission, courses, documents, fees, scholarship, placement, hostel** or **contact**."

        fallback_chips = ["admission", "courses", "contact"]
        chip_labels = {}
        for cid in fallback_chips:
            lb = LABELS.get(cid, {})
            chip_labels[cid] = lb.get("mr" if lang == "mr" else "en", cid)

        return ChatResponse(
            text=text,
            chips=fallback_chips,
            labels=chip_labels,
            is_fallback=True
        )


@app.get("/api/welcome")
async def welcome(lang: str = "en"):
    if lang == "mr":
        text = "👋 **के. के. वाघ पॉलिटेक्निक, नाशिक मध्ये आपले स्वागत आहे!**\nमी प्रवेश, अभ्यासक्रम, कागदपत्रे, शुल्क, सुविधा इत्यादींबद्दल मदत करू शकतो. विषय निवडा किंवा प्रश्न टाईप करा."
    else:
        text = "👋 **Welcome to K. K. Wagh Polytechnic, Nashik!**\nI can help with admissions, courses, documents, fees, facilities and more. Pick a topic or type your question."

    menu_items = []
    for mid in MENU_IDS:
        lb = LABELS.get(mid, {})
        menu_items.append({
            "id": mid,
            "label": lb.get("mr" if lang == "mr" else "en", mid),
            "emoji": lb.get("emoji", "")
        })

    return {"text": text, "menu_items": menu_items}


# ======================================================================
# SERVE STATIC FILES & HTML
# ======================================================================
import os
static_dir = os.path.join(os.path.dirname(__file__), "static")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

app.mount("/static", StaticFiles(directory=static_dir), name="static")
