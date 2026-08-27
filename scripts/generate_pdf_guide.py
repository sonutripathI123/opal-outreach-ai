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
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#D4AF37")) # Gold
            self.drawString(54, 750, "OPAL OUTREACH AI")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(145, 750, "|   Platform Operations & Live Transition Master Guide")
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
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#0B0F17") # Deep Obsidian
    c_gold = colors.HexColor("#B45309")    # Warm Deep Gold
    c_gold_light = colors.HexColor("#F59E0B")
    c_emerald = colors.HexColor("#047857")
    c_slate_dark = colors.HexColor("#1E293B")
    c_slate_text = colors.HexColor("#334155")
    c_bg_subtle = colors.HexColor("#F8FAFC")
    c_bg_card = colors.HexColor("#F1F5F9")

    # Typography styles
    style_cover_title = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0F172A"),
        alignment=TA_LEFT,
    )

    style_cover_sub = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#B45309"),
        alignment=TA_LEFT,
    )

    style_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    style_h2 = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#B45309"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    style_body = ParagraphStyle(
        'StandardBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_slate_text,
        spaceAfter=6,
    )

    style_body_bold = ParagraphStyle(
        'StandardBodyBold',
        parent=style_body,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0F172A"),
    )

    style_badge = ParagraphStyle(
        'BadgeText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )

    style_code = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
    )

    story = []

    # ==========================
    # COVER / HEADER BANNER
    # ==========================
    story.append(Spacer(1, 10))
    story.append(Paragraph("OPAL OUTREACH AI", style_cover_sub))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Dashboard Architecture, Button Workflows & Live Production Setup Guide", style_cover_title))
    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Author:</b> Antigravity AI Engineering Team &nbsp;|&nbsp; <b>Entity:</b> Opal Chauffeurs (Esteem Travel Service Pty Ltd, Melbourne) &nbsp;|&nbsp; <b>Date:</b> August 2026", style_body))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#D4AF37"), spaceAfter=14))

    # Executive Summary Card
    summary_data = [[
        Paragraph("<b>EXECUTIVE OVERVIEW:</b> This master reference document explains <b>(1)</b> the exact functionality of every button, tab, drawer, and action inside the Opal Outreach AI dashboard, and <b>(2)</b> the step-by-step roadmap to connect live APIs (Claude 3.5 Sonnet, Google Places, Apollo/Hunter email discovery, real SMTP email dispatch, and automated server crons) so the system transitions from initial simulation/demo mode to 100% autonomous live production.", style_body)
    ]]
    summary_table = Table(summary_data, colWidths=[504])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # ==========================
    # SECTION 1: MASTER WORKFLOW PRINCIPLE
    # ==========================
    story.append(Paragraph("1. Strict Human-in-the-Loop Operating Workflow", style_h1))
    story.append(Paragraph("The primary business objective of Opal Outreach AI is to discover corporate & event transport opportunities without risking brand reputation. Per the system's core design rule:", style_body))

    workflow_steps = [
        ["1. Discovery", "AI scans active Australian cities (Melbourne CBD, Southbank, Docklands, Tullamarine) & venues (MCEC, Crown) for corporate firms and high-attendance events."],
        ["2. Research & Scoring", "Evaluates travel demand signals (airports, executives, galas) and computes a transparent 0–100 score with full reasoning."],
        ["3. Contact Prioritization", "Finds the best decision-maker role (Head of Corporate Travel, Operations Director, Executive Assistant, Event Logistics Director)."],
        ["4. 2-Layer Drafting", "Generates personalized outreach: Fixed Opal Chauffeurs positioning + Dynamic company context (No unauthorized discounts)."],
        ["5. Human Review Gate", "Draft enters the Human Review Queue. Admin can inspect the full dossier, edit copy, approve, or reject."],
        ["6. Dispatch & Vault", "ONLY after explicit admin approval, the email is sent and archived into the permanent Sent Email Vault."],
        ["7. Reply Intelligence", "Inbound replies are analyzed by Claude AI (Interested, Call Requested, Pricing Requested) with pre-drafted reply responses."],
    ]

    wf_table_data = [[Paragraph(f"<b>{row[0]}</b>", style_body), Paragraph(row[1], style_body)] for row in workflow_steps]
    wf_table = Table(wf_table_data, colWidths=[130, 374])
    wf_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_subtle),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(wf_table)
    story.append(Spacer(1, 14))

    # ==========================
    # SECTION 2: SIDEBAR & CENTER BUTTONS EXPLANATION
    # ==========================
    story.append(Paragraph("2. Complete Guide: What Every Button & Menu Does", style_h1))
    story.append(Paragraph("Below is the exhaustive reference for all interface controls and navigation buttons in the dashboard:", style_body))

    buttons_data = [
        ["Button / Navigation Item", "Location", "What Happens When Clicked & Exact Functionality"],
        [
            "Executive Overview (/)",
            "Sidebar (Top)",
            "Opens main command center displaying KPI metric cards (Discovered Companies, Events, Pending Approvals, Inbound Replies), pending review queue spotlight, and live system activity stream."
        ],
        [
            "Corporate Companies (/companies)",
            "Sidebar (Left)",
            "Opens the Corporate Database. Allows filtering by Scale, Industry, Score, Priority (High/Medium/Review), and Status (Drafted, Contacted, Replied)."
        ],
        [
            "+ Discover / Add Company",
            "Companies Page (Top Right)",
            "Opens modal to add/discover an organization. Entering name, website, and industry triggers the AI Corporate Engine to analyze travel mobility, compute 0–100 score, synthesize contacts, and generate a draft."
        ],
        [
            "View Dossier",
            "Company & Event Cards",
            "Navigates to the full company profile (/companies/[id]), detailing detected demand signals (airports, interstate offices), score breakdown, public source citations, and decision-maker contact roster."
        ],
        [
            "Event Opportunities (/events)",
            "Sidebar (Left)",
            "Displays upcoming Melbourne conferences, trade shows, galas, and sporting events. Shows venue details (MCEC, Marvel Stadium), date countdown, and attendance estimates."
        ],
        [
            "+ Discover / Monitor Event",
            "Events Page (Top Right)",
            "Opens modal to input event details. AI analyzes keynote speaker flight arrivals, VIP group potential (Mercedes V-Class), scores transportation logistics, and drafts tailored organizer outreach."
        ],
        [
            "Human Review Queue (/review)",
            "Sidebar (Badge Indicator)",
            "THE CORE ACTION HUB. Displays all drafts waiting for administrator decision. Features a prominent badge counter showing items pending approval."
        ],
        [
            "Review, Edit & Send",
            "Review Table & Modal",
            "Opens the Master Review Dossier Modal featuring three tabs: (1) Personalized Email Draft with live editable textarea, (2) AI Research & Why Relevant, and (3) Score Factor Breakdown & Public Sources."
        ],
        [
            "Approve Draft",
            "Review Modal (Bottom Right)",
            "Marks the outreach draft as APPROVED. Advances the company status to APPROVED and unlocks direct dispatch."
        ],
        [
            "Approve & Send Now",
            "Review Modal (Bottom Right)",
            "Dispatches the email, writes the exact sent body permanently to the Sent Email Vault, updates company to CONTACTED, and schedules Day 5 & Day 10 follow-up cadences."
        ],
        [
            "Reject Outreach",
            "Review Modal (Bottom Left)",
            "Opens the Rejection Modal. Lets admin select structured reasons (Not Relevant, Wrong Contact, Email Quality Issue, Already Contacted) with feedback notes that feed into AI learning."
        ],
        [
            "Sent Email Vault (/sent)",
            "Sidebar (Left)",
            "Immutable audit vault. 'View Exact Sent Content' button displays the exact historical body sent, timestamps, and delivery verification."
        ],
        [
            "Replies & AI Inbox (/inbox)",
            "Sidebar (Left)",
            "Displays inbound replies. 'View Response & Draft Reply' opens AI intent breakdown (Interested, Meeting Request, Pricing) with pre-drafted reply. 'Process / Simulate Inbound Reply' tests reply AI."
        ],
        [
            "Follow-Up Pipeline (/follow-ups)",
            "Sidebar (Left)",
            "Manages automated multi-step cadences. 'Send Now' manually triggers a follow-up step; 'Cancel Step' halts the sequence. Automatically stops when a reply is detected."
        ],
        [
            "Service Locations (/locations)",
            "Sidebar (Config)",
            "Manage Melbourne radius (65km), toggle active/inactive capital cities (Sydney, Brisbane, Perth, Adelaide), and click '+ Add Suburb' or '+ Add City' to expand coverage."
        ],
        [
            "Services & Fleet (/services)",
            "Sidebar (Config)",
            "Edit Opal Chauffeurs service lines (Corporate, Airport, Hourly, VIP, Mercedes V-Class Vans, Limousines). Edit pricing models, keywords, and fleet specs."
        ],
        [
            "Business Profile (/profile)",
            "Sidebar (Config)",
            "Manage company name, legal entity (Esteem Travel Service Pty Ltd), address (18 Crawford Rd, Clarinda VIC 3169), phone, email signature, and collaboration terms without touching code."
        ],
        [
            "AI & Scoring Rules (/settings)",
            "Sidebar (System)",
            "Configure Anthropic Claude API credentials, primary/fast models, and adjust interactive sliders for the 0–100 Corporate & Event scoring factors."
        ],
        [
            "Audit & Activity Logs (/logs)",
            "Sidebar (System)",
            "Complete chronological audit stream of every discovery, scoring calculation, edit, approval, rejection, and sent message."
        ],
        [
            "Background Jobs (/jobs)",
            "Sidebar (System)",
            "Monitor scheduled background scanners. 'Trigger Scan Now' runs an immediate discovery pass; toggle switch pauses or enables automatic monitoring."
        ],
        [
            "Notification Bell Icon",
            "Header (Top Right)",
            "Opens flyout drawer with real-time alerts for high-priority leads, ready drafts, and incoming replies. Includes 'Mark all read' button."
        ],
    ]

    btn_table_data = []
    for idx, row in enumerate(buttons_data):
        if idx == 0:
            btn_table_data.append([
                Paragraph(f"<b>{row[0]}</b>", style_body_bold),
                Paragraph(f"<b>{row[1]}</b>", style_body_bold),
                Paragraph(f"<b>{row[2]}</b>", style_body_bold),
            ])
        else:
            btn_table_data.append([
                Paragraph(f"<b>{row[0]}</b>", style_body_bold),
                Paragraph(row[1], style_body),
                Paragraph(row[2], style_body),
            ])

    btn_table = Table(btn_table_data, colWidths=[120, 95, 289])
    btn_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, c_bg_subtle]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(btn_table)
    story.append(Spacer(1, 14))

    # ==========================
    # SECTION 3: TRANSITIONING FROM DEMO TO 100% LIVE
    # ==========================
    story.append(PageBreak())
    story.append(Paragraph("3. How to Make Everything 100% Live (Production Roadmap)", style_h1))
    story.append(Paragraph("The platform currently includes a fully functional database, realistic preloaded Melbourne data, intelligent heuristic AI synthesis, and working UI approval workflows. To connect live external APIs and turn it into a 100% automated live pipeline, follow these 5 clear steps:", style_body))
    story.append(Spacer(1, 6))

    # Step 1
    story.append(Paragraph("Step 1: Activate Live Claude 3.5 Sonnet AI API", style_h2))
    story.append(Paragraph("<b>Purpose:</b> Generates dynamic neural reasoning, ultra-personalized email copy, and deep response intent analysis instead of fallback heuristics.", style_body))
    step1_code = [
        ["1. Obtain API Key", "Sign in at https://console.anthropic.com and create an API key."],
        ["2. Add to Environment", "Open .env or .env.local file in the project folder and set:<br/><code>ANTHROPIC_API_KEY=\"sk-ant-api03-your-actual-key-here\"</code>"],
        ["3. Or via Dashboard UI", "Navigate to <b>AI & Scoring Rules (/settings)</b>, enter the key in the field, and click <b>Save AI & Scoring Rules</b>."],
    ]
    t1 = Table([[Paragraph(r[0], style_body_bold), Paragraph(r[1], style_body)] for r in step1_code], colWidths=[130, 374])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_subtle),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t1)
    story.append(Spacer(1, 10))

    # Step 2
    story.append(Paragraph("Step 2: Connect Live SMTP / Real Email Dispatch Provider", style_h2))
    story.append(Paragraph("<b>Purpose:</b> Connects the 'Approve & Send Now' button to your real email inbox or corporate email server so actual emails land in client inboxes.", style_body))
    step2_code = [
        ["Option A: Google Workspace (Recommended)", "Use <code>bookings@opalchauffeurs.com.au</code> with a Google App Password.<br/>Host: <code>smtp.gmail.com</code> | Port: <code>465</code> | Secure: <code>true</code>"],
        ["Option B: Transactional Provider", "Use <b>Resend</b> (resend.com) or <b>SendGrid</b> with verified domain <code>opalchauffeurs.com.au</code> for 99.8% inbox deliverability and instant open/click tracking."],
        ["Integration in Code", "In <code>src/app/api/outreach/drafts/[id]/send/route.ts</code>, call <code>nodemailer.createTransport()</code> or <code>resend.emails.send()</code> to deliver the message before writing to the database vault."],
    ]
    t2 = Table([[Paragraph(r[0], style_body_bold), Paragraph(r[1], style_body)] for r in step2_code], colWidths=[140, 364])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_subtle),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t2)
    story.append(Spacer(1, 10))

    # Step 3
    story.append(Paragraph("Step 3: Connect Live Company & Contact Discovery APIs", style_h2))
    story.append(Paragraph("<b>Purpose:</b> Automates finding new Melbourne companies and verified email addresses of Operations Managers and Executive Assistants.", style_body))
    step3_code = [
        ["1. Google Places API", "Fetches live Melbourne CBD, Southbank, Docklands business listings and commercial headquarters automatically."],
        ["2. Hunter.io / Apollo.io API", "Takes the company domain (e.g. <code>kwm.com</code> or <code>telstra.com.au</code>) and returns verified emails for executive roles like <i>Head of Travel</i>, <i>Operations Director</i>, or <i>Executive Assistant</i>."],
        ["3. SerpAPI / Web Search", "Scrapes recent news of corporate mergers, annual reports, and executive movements for demand signals."],
    ]
    t3 = Table([[Paragraph(r[0], style_body_bold), Paragraph(r[1], style_body)] for r in step3_code], colWidths=[140, 364])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_subtle),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t3)
    story.append(Spacer(1, 10))

    # Step 4
    story.append(Paragraph("Step 4: Live Event Ingestion & Scrapers", style_h2))
    story.append(Paragraph("<b>Purpose:</b> Continuously monitors Melbourne venues for new upcoming high-value conferences.", style_body))
    step4_code = [
        ["MCEC Melbourne Feed", "Pulls upcoming event calendar directly from Melbourne Convention & Exhibition Centre listings."],
        ["Eventbrite / Ticketmaster Business", "Ingests corporate summits, gala dinners, and exhibitions within the 7 to 90-day window."],
        ["Organizer Extraction", "Extracts the event management company and logistics director contact for instant personalized pitch generation."],
    ]
    t4 = Table([[Paragraph(r[0], style_body_bold), Paragraph(r[1], style_body)] for r in step4_code], colWidths=[140, 364])
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_subtle),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t4)
    story.append(Spacer(1, 10))

    # Step 5
    story.append(Paragraph("Step 5: Cloud Deployment & Live HTTPS URL", style_h2))
    story.append(Paragraph("<b>Purpose:</b> Run the platform 24/7 on a secure URL accessible from anywhere on phone and laptop without keeping your local machine turned on.", style_body))
    step5_code = [
        ["1-Click Vercel / Railway", "Push code to GitHub and import into Vercel or Railway. Environment variables (JWT_SECRET, DATABASE_URL, ANTHROPIC_API_KEY) are configured in the cloud settings."],
        ["Custom Domain Setup", "Link your custom subdomain, e.g. <code>outreach.opalchauffeurs.com.au</code> with automatic SSL certificate."],
        ["PostgreSQL Database", "Switch from local SQLite (<code>dev.db</code>) to managed Supabase / PostgreSQL in <code>prisma/schema.prisma</code> with one command (<code>npx prisma db push</code>)."],
    ]
    t5 = Table([[Paragraph(r[0], style_body_bold), Paragraph(r[1], style_body)] for r in step5_code], colWidths=[140, 364])
    t5.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_subtle),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t5)
    story.append(Spacer(1, 14))

    # Summary Footer Box
    footer_data = [[
        Paragraph("<b>SUMMARY & NEXT ACTION:</b> Your platform is fully operational right now in test/preview mode at <b>http://localhost:3000</b>. You can log in with <code>sonutripathi9305@gmail.com</code> / <code>02122025</code>, test all buttons, trigger discovery simulations, review dossiers, edit copy, test approvals, and simulate inbound reply classifications.", style_body)
    ]]
    footer_table = Table(footer_data, colWidths=[504])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#10B981")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(footer_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] PDF successfully generated: {pdf_filename}")

if __name__ == "__main__":
    generate_pdf()
