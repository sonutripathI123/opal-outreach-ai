import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Top Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#B45309")) # Gold
            self.drawString(54, 750, "OPAL OUTREACH AI")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(150, 750, "|   Dashboard User Guide & Live Setup Manual")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

        # Footer
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#94A3B8"))
        self.drawString(54, 36, "Opal Chauffeurs (Esteem Travel Service Pty Ltd) • Melbourne, Australia")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_text)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def generate_pdf():
    pdf_filename = "Opal_Outreach_AI_Dashboard_Guide_and_Live_Setup.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=42,
        bottomMargin=42,
    )

    styles = getSampleStyleSheet()

    # Custom Clean Styles (NO raw HTML/code tags)
    style_cover_title = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4,
    )

    style_cover_sub = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#B45309"),
        spaceAfter=4,
    )

    style_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True,
    )

    style_h2 = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#B45309"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )

    style_body = ParagraphStyle(
        'StandardBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )

    style_body_bold = ParagraphStyle(
        'StandardBodyBold',
        parent=style_body,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0F172A"),
    )

    story = []

    # Title & Metadata
    story.append(Paragraph("OPAL OUTREACH AI — COMPLETE USER & LIVE SETUP MANUAL", style_cover_sub))
    story.append(Paragraph("Dashboard Ke Sabhi Buttons Ki Working Aur System Ko Live Karne Ka Complete Guide", style_cover_title))
    story.append(Spacer(1, 2))
    story.append(Paragraph("<b>Target Business:</b> Opal Chauffeurs (Esteem Travel Service Pty Ltd, Clarinda, Melbourne VIC) &nbsp;|&nbsp; <b>Author:</b> AI Engineering Team", style_body))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#D4AF37"), spaceAfter=10))

    # Introduction Summary Box
    intro_p = Paragraph(
        "<b>IS GUIDE MEIN KYA HAI:</b><br/>"
        "1. Dashboard ke sabhi left navigation menu aur center buttons ka aasan bhasha mein matlab aur working.<br/>"
        "2. Review, Approve, Reject aur Send workflow kaise kaam karta hai.<br/>"
        "3. Demo Data vs Live Data ka farq aur system ko 100% Real Live automation par switch karne ke 5 practical steps.",
        style_body
    )
    intro_table = Table([[intro_p]], colWidths=[532])
    intro_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(intro_table)
    story.append(Spacer(1, 10))

    # SECTION 1: BUTTONS EXPLANATION
    story.append(Paragraph("1. Dashboard Ke Har Button Ka Kaam (Complete Button Guide)", style_h1))
    story.append(Paragraph("Dashboard par dikhne wale har button aur menu par click karne se kya hota hai, neeche detail mein bataya gaya hai:", style_body))
    story.append(Spacer(1, 4))

    buttons_rows = [
        [
            "Menu / Button Ka Naam",
            "Kahan Dikh raha Hai",
            "Click Karne Se Kya Hoga & Kya Kaam Karta Hai"
        ],
        [
            "Executive Overview (/)",
            "Sidebar (Sabse Upar)",
            "Main home screen khulta hai. Yahan Total Companies, Events, Pending Approvals, aur Inbound Replies ka pura summary card aur live activity feed dikhta hai."
        ],
        [
            "Corporate Companies (/companies)",
            "Sidebar (Left)",
            "AI dwara dhundhi gayi medium aur enterprise companies ki list aati hai. Industry, City, aur Priority ke hisaab se filter kar sakte hain."
        ],
        [
            "+ Discover / Add Company",
            "Companies Page (Top Right)",
            "Nayi company enter karne ka popup khulta hai. Company name aur website dalte hi AI unka travel demand aur airport score nikal kar personalised email draft taiyar kar deta hai."
        ],
        [
            "View Dossier",
            "Company Card Par",
            "Us company ka pura detailed profile khulta hai: 0-100 score ka breakdown, unki transport requirements, verified website links aur unke decision-makers."
        ],
        [
            "Event Opportunities (/events)",
            "Sidebar (Left)",
            "Melbourne ke bade upcoming events (MCEC conferences, Crown dinners, exhibitions) dikhte hain jahan VIP delegates ya transport ki zaroorat hoti hai."
        ],
        [
            "+ Discover / Monitor Event",
            "Events Page (Top Right)",
            "Naya event add karne ka popup khulta hai. AI keynote speakers ki flight timings aur Mercedes V-Class vans ki requirement calculate karke customized pitch ready karta hai."
        ],
        [
            "Human Review Queue (/review)",
            "Sidebar (Golden Badge)",
            "SABSE IMPORTANT SECTION. AI dwara likhe gaye sabhi emails yahan aapke review ke liye aate hain. Bina aapke approval ke koi bhi email nahi ja sakta."
        ],
        [
            "Review, Edit & Send",
            "Review Queue Card Par",
            "Master Review Popup khulta hai jisme 3 Tabs hote hain: (1) Email Draft, (2) AI Research aur kyu relevant hai, (3) 0-100 score breakdown."
        ],
        [
            "Edit Copy",
            "Review Popup Ke Andar",
            "Subject aur email text ko editable box bana deta hai taaki aap apni pasand se email ki wording ya phone number change kar sakein."
        ],
        [
            "Save Draft Changes",
            "Review Popup Ke Andar",
            "Aapke dwara kiye gaye wording changes ko save karta hai."
        ],
        [
            "Approve Draft",
            "Review Popup (Neeche Green)",
            "Email ko Approve mark karta hai. Iska matlab email ready hai aur dispatch queue me aa gaya hai."
        ],
        [
            "Approve & Send Now",
            "Review Popup (Neeche Gold)",
            "Email ko turant recipient ko send kar deta hai, exact sent body ko Sent Vault mein permanently lock karta hai aur Day 5 aur Day 10 ke follow-ups set kar deta hai."
        ],
        [
            "Reject Outreach",
            "Review Popup (Neeche Left)",
            "Outreach ko reject/cancel karta hai. Aap reason select kar sakte hain (Wrong contact, Not relevant) taaki AI aage aisi galti na kare."
        ],
        [
            "Sent Email Vault (/sent)",
            "Sidebar (Left)",
            "Jo emails sach me send ho chuki hain, unka permanent record yahan rehta hai. 'View Exact Sent Content' button se original sent email padh sakte hain."
        ],
        [
            "Replies & AI Inbox (/inbox)",
            "Sidebar (Left)",
            "Clients ke aaye hue replies ka AI analysis dikhata hai (Interested, Meeting Request, Price pucha hai) aur unko bhejne ke liye AI ka ready-made reply answer deta hai."
        ],
        [
            "Process / Simulate Inbound Reply",
            "Inbox Page (Top Right)",
            "System ko test karne ke liye customer reply message simulate karne ka option deta hai taaki aap check kar sakein AI kaise response samajhta hai."
        ],
        [
            "Follow-Up Pipeline (/follow-ups)",
            "Sidebar (Left)",
            "Day 0 -> Day 5 -> Day 10 ki follow-up series manage karta hai. Jaise hi client reply de deta hai, follow-up apne aap STOP ho jata hai."
        ],
        [
            "Service Locations (/locations)",
            "Sidebar (Config)",
            "Melbourne ka service radius (65 km) badhane, Sydney/Brisbane/Perth activate karne aur naye suburbs add karne ke liye."
        ],
        [
            "Services & Fleet (/services)",
            "Sidebar (Config)",
            "Opal Chauffeurs ki service lines (Airport Transfers, Corporate, Hourly, Luxury Sedans, Mercedes V-Class) aur unke pricing details edit karne ke liye."
        ],
        [
            "Business Profile (/profile)",
            "Sidebar (Config)",
            "Opal Chauffeurs brand info, legal entity (Esteem Travel Service Pty Ltd), Clarinda address, phone number, email signature aur offers update karne ke liye."
        ],
        [
            "AI & Scoring Rules (/settings)",
            "Sidebar (System)",
            "Claude API key dalne aur 0-100 score ke factor weights ko sliders se kam-zyada karne ke liye."
        ],
        [
            "Background Jobs (/jobs)",
            "Sidebar (System)",
            "Background automated scanner timers. 'Trigger Scan Now' dabane se turant Melbourne me live corporate scan start ho jata hai."
        ],
        [
            "Notification Bell Icon",
            "Header (Top Right)",
            "Naye high-priority leads, ready drafts aur replies ke live popups dikhata hai."
        ],
    ]

    btn_data = []
    for i, r in enumerate(buttons_rows):
        if i == 0:
            btn_data.append([
                Paragraph(f"<b>{r[0]}</b>", style_body_bold),
                Paragraph(f"<b>{r[1]}</b>", style_body_bold),
                Paragraph(f"<b>{r[2]}</b>", style_body_bold),
            ])
        else:
            btn_data.append([
                Paragraph(f"<b>{r[0]}</b>", style_body_bold),
                Paragraph(r[1], style_body),
                Paragraph(r[2], style_body),
            ])

    btn_table = Table(btn_data, colWidths=[118, 94, 320])
    btn_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(btn_table)
    story.append(Spacer(1, 8))

    # SECTION 2: DEMO VS LIVE EXPLANATION
    story.append(PageBreak())
    story.append(Paragraph("2. Abhi Demo / Sample Report Kyu Dikh Raha Hai?", style_h1))
    story.append(Paragraph(
        "Aapke platform mein currently <b>pura core system, SQLite database, UI layout, scoring algorithm, aur human approval workflow fully programmed aur functional hai</b>. "
        "Lekin jab tak aap apni live third-party keys (Claude API, Email SMTP, Discovery APIs) nahi jodte, tab tak system aapko <b>Demo/Simulation Mode</b> mein sample Melbourne companies (jaise Telstra Enterprise, King & Wood Mallesons, Asia-Pacific Energy Summit) ke sath kaam karke dikhata hai taaki aap pura workflow test kar sakein bina actual paise kharch kiye ya kisi ko galat email bheje.",
        style_body
    ))
    story.append(Spacer(1, 4))

    # SECTION 3: STEP-BY-STEP LIVE PROCESS
    story.append(Paragraph("3. System Ko 100% Real Live Automation Karne Ka 5-Step Process", style_h1))
    story.append(Paragraph("Isko real world live production par chalane ke liye sirf ye 5 aasan steps follow karne hote hain:", style_body))
    story.append(Spacer(1, 4))

    steps_data = [
        [
            "Step",
            "Kis Cheez Ka Setup Hai",
            "Kyu Zaroori Hai (Benefits)",
            "Kaise Karna Hai (Aasan Steps)"
        ],
        [
            "Step 1",
            "Live Claude 3.5 Sonnet API Key",
            "AI har company aur event ke liye original, real-time personalized email likhega aur client ke reply ko deeply analyze karega.",
            "1. console.anthropic.com par account banakar API key copy karein.<br/>2. Dashboard ke 'AI & Scoring Rules' (/settings) page par jaakar key paste karein aur Save click karein."
        ],
        [
            "Step 2",
            "Real Email Sending (Google Workspace ya Resend)",
            "Jab aap 'Approve & Send Now' dabayenge, toh email sach me client ke Gmail/Outlook inbox mein deliver hogi.",
            "1. Google Workspace (bookings@opalchauffeurs.com.au) ka 16-digit App Password use karein.<br/>2. Ya Resend.com par opalchauffeurs.com.au verify karein taaki 100% inbox delivery mile."
        ],
        [
            "Step 3",
            "Company & Contact Finder APIs (Google / Apollo / Hunter)",
            "Melbourne ki nayi companies aur unke Executive Assistants / Operations Directors ke verified official business emails internet se automatic dhundhta hai.",
            "1. Google Places API: Melbourne CBD ke business headquarters search karta hai.<br/>2. Apollo.io ya Hunter.io API: Domain se direct C-suite aur Travel Managers ka verified email nikalta hai."
        ],
        [
            "Step 4",
            "Live Melbourne Event Ingestion (MCEC / Eventbrite)",
            "Melbourne Convention Centre (MCEC) aur Crown ke official websites se naye upcoming conferences automatic dashboard me lata hai.",
            "1. MCEC public RSS feed ya Eventbrite Australia API connect hoti hai.<br/>2. Har 24 ghante me background job naye events scan karke dashboard me show karti hai."
        ],
        [
            "Step 5",
            "Cloud Deployment (24/7 Live HTTPS Domain)",
            "Platform cloud server par 24/7 bina laptop on kiye chalta rahega aur aap mobile phone se kahin se bhi access kar sakte hain.",
            "1. Project ko Vercel ya Railway cloud par 1-click deploy karein.<br/>2. Apna subdomain link karein: outreach.opalchauffeurs.com.au<br/>3. SSL Certificate ke sath secure HTTPS link mil jayega."
        ],
    ]

    steps_table_data = []
    for idx, row in enumerate(steps_data):
        if idx == 0:
            steps_table_data.append([
                Paragraph(f"<b>{row[0]}</b>", style_body_bold),
                Paragraph(f"<b>{row[1]}</b>", style_body_bold),
                Paragraph(f"<b>{row[2]}</b>", style_body_bold),
                Paragraph(f"<b>{row[3]}</b>", style_body_bold),
            ])
        else:
            steps_table_data.append([
                Paragraph(f"<b>{row[0]}</b>", style_body_bold),
                Paragraph(row[1], style_body_bold),
                Paragraph(row[2], style_body),
                Paragraph(row[3], style_body),
            ])

    steps_table = Table(steps_table_data, colWidths=[38, 112, 152, 230])
    steps_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(steps_table)
    story.append(Spacer(1, 8))

    # SECTION 4: HOW TO USE RIGHT NOW
    story.append(Paragraph("4. Abhi Kaise Test Aur Use Karein (Current Live Testing)", style_h1))
    story.append(Paragraph(
        "Aap abhi apne laptop ya mobile par <b>http://localhost:3000</b> open karke ye testing kar sakte hain:<br/>"
        "• <b>Login:</b> Email: <b>sonutripathi9305@gmail.com</b> | Password: <b>02122025</b><br/>"
        "• <b>Review Queue:</b> 'Human Review Queue' (/review) par click karein aur pending draft ko edit aur approve karke dekhein.<br/>"
        "• <b>Nayi Company:</b> 'Corporate Companies' (/companies) par jaakar '+ Discover / Add Company' dabayein aur dekhein AI kaise turant 0-100 score nikalta hai.<br/>"
        "• <b>Reply Check:</b> 'Replies & AI Inbox' (/inbox) par jakar customer ka reply test karein aur AI ka smart response draft dekhein.<br/>"
        "• <b>Settings:</b> 'Business Profile' (/profile) aur 'Services & Fleet' (/services) par jaakar phone number ya pricing update karein.",
        style_body
    ))
    story.append(Spacer(1, 6))

    # Final Summary Card
    final_card = [[
        Paragraph(
            "<b>FINAL CONCLUSION:</b> Aapka platform fully built hai, database configured hai, aur credentials update ho chuki hain. "
            "Aap jab chahein, upar diye gaye 5 steps me se jis API ko connect karna chahein bata sakte hain, hum turant live API integrate kar denge!",
            style_body
        )
    ]]
    fc_table = Table(final_card, colWidths=[532])
    fc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#10B981")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(fc_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] Clean PDF generated successfully: {pdf_filename}")

if __name__ == "__main__":
    generate_pdf()
