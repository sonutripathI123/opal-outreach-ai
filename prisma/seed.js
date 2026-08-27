"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting Opal Outreach AI database seeding...');
    // 1. Create or update Default Admin User
    const passwordHash = await bcryptjs_1.default.hash('02122025', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'sonutripathi9305@gmail.com' },
        update: { passwordHash },
        create: {
            email: 'sonutripathi9305@gmail.com',
            name: 'Sonu Tripathi (Admin)',
            passwordHash,
            role: 'ADMIN',
        },
    });
    console.log(`✅ Admin user seeded: ${adminUser.email}`);
    // 2. Business Profile for Opal Chauffeurs
    const existingProfile = await prisma.businessProfile.findFirst();
    if (!existingProfile) {
        await prisma.businessProfile.create({
            data: {
                companyName: 'Opal Chauffeurs',
                tradingName: 'Esteem Travel Service Pty Ltd',
                website: 'https://www.opalchauffeurs.com.au/',
                description: 'Opal Chauffeurs (Esteem Travel Service Pty Ltd) is a premier private chauffeur transportation service based in Melbourne, Australia. We deliver unparalleled corporate travel, flight-tracked airport transfers, VIP executive transit, hourly private driver services, and comprehensive event mobility solutions with our pristine luxury fleet.',
                phone: '+61 432 000 718',
                email: 'book@opalchauffeurs.com.au',
                address: '',
                suburb: 'Melbourne',
                state: 'VIC',
                postcode: '3000',
                country: 'Australia',
                brandPositioning: 'Melbourne’s premier executive transport partner. Punctual, discreet, 24/7 reliability.',
                emailSignature: `Warm regards,\n\nCorporate Partnerships Team\nOpal Chauffeurs\nWeb: https://www.opalchauffeurs.com.au/\nEmail: book@opalchauffeurs.com.au | Direct: +61 432 000 718`,
                collaborationOffer: 'Introducing Opal Chauffeurs as your dedicated executive transportation and corporate travel partner. We provide seamless corporate account onboarding, priority flight-tracked airport transfers, executive client transit, and tailored corporate event coordination.',
                customNotes: 'Fleet includes Executive Sedans (Mercedes E-Class, BMW 7-Series, Audi A8), Luxury SUVs (Audi Q7, Lexus RX), Mercedes V-Class People Movers, and Stretch Limousines.',
            },
        });
        console.log('✅ Opal Chauffeurs Business Profile seeded');
    }
    // 3. Services Catalog
    const servicesData = [
        {
            name: 'Corporate & Executive Chauffeur Services',
            slug: 'corporate-executive-travel',
            category: 'Corporate',
            shortDescription: 'Punctual, discreet, and refined transportation for executives, board members, and visiting corporate clients.',
            fullDescription: 'Tailored for senior executives, visiting dignitaries, and corporate delegations. Features complimentary Wi-Fi, flight coordination, flexible billing, and professional chauffeurs trained in executive protocol.',
            features: JSON.stringify(['Dedicated Corporate Account Manager', 'Priority 24/7 booking support', 'Consolidated monthly invoicing', 'Flight tracking & guaranteed on-time pickup', 'Pristine European luxury fleet']),
            targetAudience: 'Medium to large enterprises, financial institutions, consulting firms, legal practices, multinational HQs.',
            pricingModel: 'Fixed corporate rate card / Hourly / Dedicated contract',
            suggestedKeywords: 'executive travel, corporate chauffeur Melbourne, business airport transfer, board member transport',
            displayOrder: 1,
        },
        {
            name: 'Airport Transfers (Flight Tracked & Meet & Greet)',
            slug: 'airport-transfers',
            category: 'Airport',
            shortDescription: 'Seamless transfers to/from Melbourne Airport (Tullamarine) & Avalon Airport with live flight tracking and luggage assistance.',
            fullDescription: 'Eliminates transit stress for arriving and departing business travelers. Our drivers monitor real-time flight schedules, adjust for early arrivals or delays, and meet guests directly in the arrivals hall with personalized name boards.',
            features: JSON.stringify(['Real-time flight radar tracking', 'Inside-terminal Meet & Greet', 'Complimentary wait time for delays', 'Direct curb-to-curb luggage handling', 'Melbourne & Avalon Airport coverage']),
            targetAudience: 'Frequent business flyers, international executive visitors, interstate client delegations.',
            pricingModel: 'Fixed-price airport transfer per zone/suburb',
            suggestedKeywords: 'Melbourne airport chauffeur, Tullamarine executive transfer, Avalon VIP transport',
            displayOrder: 2,
        },
        {
            name: 'Hourly As-Directed Car Service',
            slug: 'hourly-car-service',
            category: 'Hourly',
            shortDescription: 'Flexible hourly booking with a dedicated driver on standby for multi-stop meetings, roadshows, and executive itineraries.',
            fullDescription: 'Perfect for executives with dynamic schedules, multi-venue client roadshows, site inspections, or diplomatic appointments. Your chauffeur remains on call at all times.',
            features: JSON.stringify(['Dedicated chauffeur on-demand', 'Unlimited stops within booking duration', 'Maximum scheduling flexibility', 'Vehicle kept in pristine standby condition', 'Direct communication with driver']),
            targetAudience: 'C-suite executives, investment bankers, venture capital roadshows, VIP delegates.',
            pricingModel: 'Hourly hire (minimum 2 hours)',
            suggestedKeywords: 'hourly chauffeur Melbourne, as directed car service, executive roadshow transport',
            displayOrder: 3,
        },
        {
            name: 'Corporate Event & Conference Transfers',
            slug: 'event-conference-transfers',
            category: 'Event',
            shortDescription: 'End-to-end ground transportation management for trade shows, gala dinners, annual conferences, and summit attendees.',
            fullDescription: 'Comprehensive fleet coordination for corporate events of any scale. We orchestrate executive shuttles, speaker transfers, and VIP attendee movements seamlessly.',
            features: JSON.stringify(['Multi-vehicle fleet deployment', 'On-site logistics coordinator available', 'Coordinated group transfers with luxury vans', 'Bespoke signage and itinerary management', 'MCEC, Marvel Stadium, Crown Palladium coverage']),
            targetAudience: 'Event organizers, conference directors, enterprise marketing teams, exhibition hosts.',
            pricingModel: 'Custom event package / Fleet reservation',
            suggestedKeywords: 'conference transport Melbourne, MCEC event chauffeur, corporate gala transfer',
            displayOrder: 4,
        },
        {
            name: 'VIP & Luxury Private Transportation',
            slug: 'vip-luxury-transport',
            category: 'VIP',
            shortDescription: 'Ultra-exclusive private transportation with highest levels of privacy, security awareness, and luxury sedans.',
            fullDescription: 'Designed for high-profile individuals, celebrities, international keynote speakers, and VIP clients requiring complete confidentiality, discrete routes, and premium comfort.',
            features: JSON.stringify(['Strict confidentiality agreements', 'Top-tier luxury sedans & tinted privacy glass', 'Security-conscious route planning', 'Personalized vehicle temperature and amenities', '24/7 concierge liaison']),
            targetAudience: 'Celebrities, keynote speakers, HNWI, luxury brands, private equity leaders.',
            pricingModel: 'Bespoke VIP rates',
            suggestedKeywords: 'VIP chauffeur Melbourne, luxury private driver, celebrity transport',
            displayOrder: 5,
        },
        {
            name: 'Group Transfers & Luxury People Movers',
            slug: 'group-transfers-luxury-vans',
            category: 'Fleet',
            shortDescription: 'Mercedes-Benz V-Class and luxury passenger vans accommodating up to 7-11 passengers with full luggage capacity.',
            fullDescription: 'High-comfort group transportation for executive teams, company retreats, board meetings, and client delegations traveling together without compromising luxury.',
            features: JSON.stringify(['Mercedes-Benz V-Class / Luxury Sprinters', 'Leather reclining seats & individual climate control', 'Spacious luggage compartments', 'Group airport shuttles & dinner transfers', 'Professional uniformed driver']),
            targetAudience: 'Corporate project teams, board delegations, wedding parties, conference speaker panels.',
            pricingModel: 'Fixed group rates / Hourly packages',
            suggestedKeywords: 'luxury van hire Melbourne, executive people mover, corporate group transport',
            displayOrder: 6,
        },
    ];
    for (const s of servicesData) {
        await prisma.service.upsert({
            where: { slug: s.slug },
            update: s,
            create: s,
        });
    }
    console.log('✅ Opal Chauffeurs Services seeded (6 core service lines)');
    // 4. Service Locations & Suburbs (Scalable structure)
    const melbourneLoc = await prisma.serviceLocation.upsert({
        where: { id: 'loc-melbourne-vic' },
        update: {
            cityName: 'Melbourne',
            state: 'VIC',
            isPrimary: true,
            isActive: true,
            serviceRadiusKm: 65,
            priorityLevel: 'HIGH',
            notes: 'Primary headquarters and central fleet operation hub. Full 24/7 coverage.',
        },
        create: {
            id: 'loc-melbourne-vic',
            cityName: 'Melbourne',
            state: 'VIC',
            isPrimary: true,
            isActive: true,
            serviceRadiusKm: 65,
            priorityLevel: 'HIGH',
            notes: 'Primary headquarters and central fleet operation hub. Full 24/7 coverage.',
        },
    });
    const expansionLocations = [
        { id: 'loc-sydney-nsw', cityName: 'Sydney', state: 'NSW', isPrimary: false, isActive: true, serviceRadiusKm: 50, priorityLevel: 'HIGH', notes: 'Active interstate partner network covering Sydney CBD and Kingsford Smith Airport.' },
        { id: 'loc-brisbane-qld', cityName: 'Brisbane', state: 'QLD', isPrimary: false, isActive: true, serviceRadiusKm: 45, priorityLevel: 'MEDIUM', notes: 'Active partner network covering Brisbane CBD and Airport.' },
        { id: 'loc-perth-wa', cityName: 'Perth', state: 'WA', isPrimary: false, isActive: true, serviceRadiusKm: 40, priorityLevel: 'MEDIUM', notes: 'Active partner network for corporate mining/energy executive transit.' },
        { id: 'loc-adelaide-sa', cityName: 'Adelaide', state: 'SA', isPrimary: false, isActive: true, serviceRadiusKm: 35, priorityLevel: 'MEDIUM', notes: 'Available on-demand for corporate events and executive travel.' },
    ];
    for (const exp of expansionLocations) {
        await prisma.serviceLocation.upsert({
            where: { id: exp.id },
            update: exp,
            create: exp,
        });
    }
    // Seed Melbourne key commercial suburbs
    const melbSuburbs = [
        { id: 'sub-melb-cbd', name: 'Melbourne CBD', postcode: '3000', commercialHubType: 'CBD', isPriority: true },
        { id: 'sub-southbank', name: 'Southbank', postcode: '3006', commercialHubType: 'BUSINESS_DISTRICT', isPriority: true },
        { id: 'sub-docklands', name: 'Docklands', postcode: '3008', commercialHubType: 'BUSINESS_PARK', isPriority: true },
        { id: 'sub-tullamarine', name: 'Tullamarine (Melbourne Airport)', postcode: '3045', commercialHubType: 'AIRPORT', isPriority: true },
        { id: 'sub-south-yarra', name: 'South Yarra', postcode: '3141', commercialHubType: 'LUXURY_DIPLOMATIC', isPriority: true },
        { id: 'sub-st-kilda', name: 'St Kilda', postcode: '3182', commercialHubType: 'BUSINESS_DISTRICT', isPriority: false },
        { id: 'sub-richmond', name: 'Richmond', postcode: '3121', commercialHubType: 'BUSINESS_PARK', isPriority: true },
        { id: 'sub-clayton', name: 'Clayton / Clarinda', postcode: '3169', commercialHubType: 'BUSINESS_PARK', isPriority: true },
        { id: 'sub-east-melbourne', name: 'East Melbourne', postcode: '3002', commercialHubType: 'LUXURY_DIPLOMATIC', isPriority: true },
        { id: 'sub-brighton', name: 'Brighton', postcode: '3186', commercialHubType: 'LUXURY_DIPLOMATIC', isPriority: false },
    ];
    for (const sub of melbSuburbs) {
        await prisma.suburb.upsert({
            where: { id: sub.id },
            update: { ...sub, locationId: melbourneLoc.id },
            create: { ...sub, locationId: melbourneLoc.id },
        });
    }
    console.log('✅ Service Locations (Melbourne + 4 Australian capital hubs) & Suburbs seeded');
    // 5. Seed Corporate Companies with In-Depth Research, Scoring & Decision-Makers
    const company1 = await prisma.company.upsert({
        where: { id: 'comp-telstra-vic' },
        update: {},
        create: {
            id: 'comp-telstra-vic',
            name: 'Telstra Enterprise Solutions',
            legalName: 'Telstra Corporation Limited',
            website: 'https://www.telstra.com.au',
            domain: 'telstra.com.au',
            industry: 'Telecommunications & Enterprise IT',
            subIndustry: 'Digital Infrastructure & Cloud',
            city: 'Melbourne',
            state: 'VIC',
            headquartersAddress: '242 Exhibition St, Melbourne VIC 3000',
            approximateSize: 'Enterprise (1000+)',
            employeeCountEstimate: 24000,
            officeCount: 18,
            internationalPresence: true,
            corporateActivityLevel: 'HIGH',
            executiveTravelLikelihood: 'HIGH',
            eventHostingLikelihood: 'HIGH',
            isClientFacing: true,
            status: 'DRAFTED',
            priority: 'HIGH',
            opportunityScore: 92.0,
            isVerified: true,
        },
    });
    await prisma.companyResearch.upsert({
        where: { companyId: company1.id },
        update: {},
        create: {
            companyId: company1.id,
            summary: 'Major telecommunications and enterprise infrastructure headquarters in Melbourne Exhibition Street. Continuous interstate executive travel between Sydney, Brisbane, and Canberra offices. High volume of corporate client events, vendor summits, and frequent VIP guest hosting.',
            businessModel: 'Enterprise technology, cloud services, cyber security consulting, and B2B telecommunications.',
            detectedSignals: JSON.stringify({
                strong: ['Multi-city national executive presence', 'Frequent senior executive airport transit (Tullamarine)', 'Annual corporate summits & vendor partner dinners', 'Dedicated executive assistant travel desk'],
                medium: ['Multiple regional hub visits', 'Board member quarterly assemblies'],
                weak: ['Standard commuter staff on flexible working'],
            }),
            evidenceSources: JSON.stringify([
                { title: 'Telstra Corporate Governance & Melbourne HQ Profile', url: 'https://www.telstra.com.au/aboutus/our-company', snippet: 'Headquartered at 242 Exhibition Street, Melbourne, managing national enterprise sales and executive operations.' },
                { title: 'Telstra Enterprise Summit 2026', url: 'https://telstra.com/enterprise/events', snippet: 'Hosting enterprise client summits across Melbourne Convention Centre and Sydney.' },
            ]),
            confidenceLevel: 0.94,
            inferredDemand: 'High recurring requirement for executive airport transfers and hourly corporate chauffeur accounts for visiting leadership.',
            confirmedEvidence: 'Physical Melbourne HQ at 242 Exhibition St, national executive team, documented multi-office executive travel.',
        },
    });
    await prisma.companyOpportunity.upsert({
        where: { companyId: company1.id },
        update: {},
        create: {
            companyId: company1.id,
            score: 92.0,
            scoreBreakdown: JSON.stringify({
                companySize: 20, // 20/20 (Enterprise)
                locationRelevance: 15, // 15/15 (Melbourne CBD HQ)
                travelDemand: 19, // 19/20 (Very high airport and interstate transit)
                executiveActivity: 14, // 14/15 (Active C-suite & VP team)
                eventsVipActivity: 14, // 14/15 (Frequent enterprise hosting)
                serviceMatch: 10, // 10/10 (Matches corporate, airport, and luxury fleet)
                businessVerification: 5, // 5/5 (Public enterprise listing)
            }),
            priority: 'HIGH',
            whyRelevant: 'Headquartered in Melbourne CBD with 18 national offices and high executive mobility. Frequent interstate business travel creates steady demand for flight-tracked airport transfers and corporate chauffeur accounts for visiting executives.',
            recommendedServices: JSON.stringify(['Corporate & Executive Chauffeur Services', 'Airport Transfers (Flight Tracked)', 'Hourly As-Directed Car Service']),
            targetUseCases: JSON.stringify(['C-suite interstate airport transit to/from Tullamarine', 'Board meeting transport coordination', 'VIP enterprise client hospitality']),
            confidenceScore: 0.94,
        },
    });
    const contact1 = await prisma.contact.upsert({
        where: { id: 'contact-telstra-ea' },
        update: {},
        create: {
            id: 'contact-telstra-ea',
            companyId: company1.id,
            fullName: 'Sarah Jenkins',
            firstName: 'Sarah',
            lastName: 'Jenkins',
            jobTitle: 'Head of Executive Operations & Corporate Travel',
            department: 'Executive Office / Operations',
            seniorityLevel: 'DIRECTOR',
            email: 'sarah.jenkins@telstra.com',
            emailSource: 'OFFICIAL_WEBSITE',
            emailConfidence: 0.92,
            verificationStatus: 'VERIFIED',
            linkedinUrl: 'https://linkedin.com/in/sarahjenkins-ops',
            isPrimaryContact: true,
        },
    });
    await prisma.emailDraft.upsert({
        where: { id: 'draft-telstra-1' },
        update: {},
        create: {
            id: 'draft-telstra-1',
            companyId: company1.id,
            contactId: contact1.id,
            recipientName: 'Sarah Jenkins',
            recipientEmail: 'sarah.jenkins@telstra.com',
            recipientRole: 'Head of Executive Operations & Corporate Travel',
            subject: 'Executive Chauffeur & Airport Transport Partnership for Telstra Enterprise Team',
            fixedContent: 'Opal Chauffeurs is a Melbourne-based premium chauffeur service providing flight-tracked airport transfers, corporate accounts, and executive travel across Melbourne and major Australian capitals with an immaculate fleet of executive sedans, luxury SUVs, and Mercedes V-Class people movers.',
            dynamicContent: 'With Telstra’s Melbourne headquarters on Exhibition Street and regular executive travel across interstate offices, having a dependable, 24/7 flight-tracked chauffeur partner ensures seamless arrival and departure for your leadership team and visiting enterprise clients.',
            fullBodyText: `Dear Sarah,

I hope this week is going well for you and the executive operations team at Telstra.

With Telstra’s corporate headquarters situated on Exhibition Street and extensive business travel between your Melbourne, Sydney, and interstate offices, managing executive transit with complete punctuality and discretion is vital.

I am reaching out from Opal Chauffeurs to introduce our corporate and executive transportation services. We specialize in supporting corporate travel desks with:

• Flight-Tracked Airport Transfers: Meet-and-greet arrivals at Tullamarine with live flight radar monitoring, eliminating waiting time and transit delays for your leadership team.
• Dedicated Corporate Accounts: Priority booking, centralized monthly invoicing, and customized transport logistics for visiting board members and VIP guests.
• Executive Fleet: Pristine Mercedes-Benz and European sedans, luxury SUVs, and Mercedes V-Class people movers suited for individual transit or team delegations.

We would welcome the opportunity to connect briefly to discuss how we can support Telstra’s ongoing executive travel requirements in Melbourne and across our national partner network.

Would you be open to a brief 5-minute call or reviewing our corporate service overview this week?

Warm regards,

Corporate Partnerships Team
Opal Chauffeurs
Web: https://www.opalchauffeurs.com.au/
Email: book@opalchauffeurs.com.au | Direct: +61 432 000 718`,
            personalizationReasoning: 'Addressed to Head of Executive Operations; references Telstra Melbourne HQ location, interstate travel requirements, flight tracking at Tullamarine Airport, and multi-passenger people mover options for visiting delegates.',
            aiEvidenceCited: JSON.stringify(['Melbourne HQ at 242 Exhibition St', 'High volume executive interstate travel', 'Corporate travel desk responsibilities']),
            status: 'READY_FOR_REVIEW',
        },
    });
    // Company 2: King & Wood Mallesons Melbourne (Legal / Professional Services)
    const company2 = await prisma.company.upsert({
        where: { id: 'comp-kwm-vic' },
        update: {},
        create: {
            id: 'comp-kwm-vic',
            name: 'King & Wood Mallesons Melbourne',
            legalName: 'King & Wood Mallesons Pty Ltd',
            website: 'https://www.kwm.com',
            domain: 'kwm.com',
            industry: 'Legal Services & Commercial Law',
            subIndustry: 'Corporate & Finance Law',
            city: 'Melbourne',
            state: 'VIC',
            headquartersAddress: 'Level 27, 447 Collins St (Collins Arch), Melbourne VIC 3000',
            approximateSize: 'Large (200-1000)',
            employeeCountEstimate: 850,
            officeCount: 6,
            internationalPresence: true,
            corporateActivityLevel: 'HIGH',
            executiveTravelLikelihood: 'HIGH',
            eventHostingLikelihood: 'HIGH',
            isClientFacing: true,
            status: 'READY_FOR_REVIEW',
            priority: 'HIGH',
            opportunityScore: 88.5,
            isVerified: true,
        },
    });
    await prisma.companyResearch.upsert({
        where: { companyId: company2.id },
        update: {},
        create: {
            companyId: company2.id,
            summary: 'Leading top-tier corporate law firm located at Collins Arch. High partner mobility, frequent international client visits for M&A deal rooms, court appearances, and after-hours executive transport requirements.',
            businessModel: 'Corporate law, M&A advisory, litigation, and financial services advisory.',
            detectedSignals: JSON.stringify({
                strong: ['Premium Collins Arch CBD location', 'International and interstate partner travel', 'Late-night executive safe travel policy', 'High-profile client hospitality'],
                medium: ['Annual legal symposium and partner retreat hosting'],
                weak: ['Junior paralegal staff on public transport'],
            }),
            evidenceSources: JSON.stringify([
                { title: 'KWM Melbourne Office Profile', url: 'https://www.kwm.com/en/au/locations/australia/melbourne', snippet: 'Located at Level 27, Collins Arch, 447 Collins Street Melbourne.' },
            ]),
            confidenceLevel: 0.91,
            inferredDemand: 'Regular demand for premium executive sedans for partner airport transfers and corporate client dinners.',
            confirmedEvidence: 'Premium Collins Street address, top-tier law firm status, active partner travel roster.',
        },
    });
    await prisma.companyOpportunity.upsert({
        where: { companyId: company2.id },
        update: {},
        create: {
            companyId: company2.id,
            score: 88.5,
            scoreBreakdown: JSON.stringify({
                companySize: 18,
                locationRelevance: 15,
                travelDemand: 18,
                executiveActivity: 14,
                eventsVipActivity: 13,
                serviceMatch: 10,
                businessVerification: 5,
            }),
            priority: 'HIGH',
            whyRelevant: 'Top-tier corporate legal practice at Collins Arch with extensive partner transit, high-net-worth client hosting, and regular late-night and airport transfer requirements.',
            recommendedServices: JSON.stringify(['Corporate & Executive Chauffeur Services', 'Airport Transfers', 'Hourly As-Directed Car Service']),
            targetUseCases: JSON.stringify(['Partner airport transfers', 'Visiting M&A client transit', 'Late-night executive safe transit']),
            confidenceScore: 0.91,
        },
    });
    const contact2 = await prisma.contact.upsert({
        where: { id: 'contact-kwm-admin' },
        update: {},
        create: {
            id: 'contact-kwm-admin',
            companyId: company2.id,
            fullName: 'Marcus Vance',
            firstName: 'Marcus',
            lastName: 'Vance',
            jobTitle: 'Director of Practice Operations & Facilities',
            department: 'Operations & Practice Management',
            seniorityLevel: 'DIRECTOR',
            email: 'marcus.vance@au.kwm.com',
            emailSource: 'VERIFIED_DIRECTORY',
            emailConfidence: 0.88,
            verificationStatus: 'VERIFIED',
            isPrimaryContact: true,
        },
    });
    await prisma.emailDraft.upsert({
        where: { id: 'draft-kwm-1' },
        update: {},
        create: {
            id: 'draft-kwm-1',
            companyId: company2.id,
            contactId: contact2.id,
            recipientName: 'Marcus Vance',
            recipientEmail: 'marcus.vance@au.kwm.com',
            recipientRole: 'Director of Practice Operations & Facilities',
            subject: 'Premium Executive & Partner Chauffeur Services | Opal Chauffeurs for KWM Melbourne',
            fixedContent: 'Opal Chauffeurs provides professional chauffeur services, dedicated corporate account facilities, and flight-tracked airport transit across Melbourne with an emphasis on confidentiality, punctuality, and immaculate presentation.',
            dynamicContent: 'With King & Wood Mallesons’ prestigious practice at Collins Arch and regular partner travel across federal courts, interstate offices, and corporate clients, having a dependable luxury chauffeur service ensures an effortless travel experience.',
            fullBodyText: `Dear Marcus,

I hope you are having a productive week.

Given King & Wood Mallesons’ distinguished position at Collins Arch and the demanding transit requirements of your partners and visiting corporate clients, maintaining flawless, discreet ground transportation is essential.

I am writing on behalf of Opal Chauffeurs to introduce our corporate chauffeur solutions tailored for Melbourne’s leading professional and legal practices:

• Partner & Client Airport Transfers: Real-time flight tracking to and from Tullamarine, ensuring partners are met inside the terminal without delay.
• As-Directed & Hourly Chauffeur Service: Flexible standby for partners attending multiple court listings, client negotiations, or evening corporate events.
• Confidentiality & Luxury Fleet: Uniformed chauffeurs operating under strict discretion in executive Mercedes-Benz sedans and luxury SUVs.

We would be delighted to set up a corporate booking facility or provide sample corporate rates for your practice operations team.

Could we coordinate a brief 5-minute conversation or share our corporate rate schedule?

Warm regards,

Corporate Partnerships Team
Opal Chauffeurs
Web: https://www.opalchauffeurs.com.au/
Email: book@opalchauffeurs.com.au | Direct: +61 432 000 718`,
            personalizationReasoning: 'Focused on legal practice operational needs: partner confidentiality, court and airport transit, Collins Arch location, and corporate billing.',
            aiEvidenceCited: JSON.stringify(['Collins Arch office location', 'Legal partner travel intensity', 'Practice operations management role']),
            status: 'READY_FOR_REVIEW',
        },
    });
    // 6. Seed High-Value Melbourne Events & Conferences
    const event1 = await prisma.event.upsert({
        where: { slug: 'melbourne-mining-energy-summit-2026' },
        update: {},
        create: {
            id: 'event-mining-2026',
            name: 'Asia-Pacific Mining & Energy Leadership Summit 2026',
            slug: 'melbourne-mining-energy-summit-2026',
            eventType: 'CONFERENCE',
            startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18), // 18 days from now
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20),
            venueName: 'Melbourne Convention and Exhibition Centre (MCEC)',
            venueAddress: '1 Convention Centre Pl, South Wharf VIC 3006',
            suburb: 'South Wharf',
            city: 'Melbourne',
            state: 'VIC',
            expectedAttendance: 2800,
            ticketPriceRange: '$1,200 - $3,500 AUD',
            vipPresenceLikelihood: 'HIGH',
            organizerName: 'Elena Rostova',
            organizerCompany: 'Global Energy Expos & Conferences Pty Ltd',
            organizerWebsite: 'https://globalenergyexpos.com.au',
            status: 'DRAFTED',
            priority: 'HIGH',
            opportunityScore: 91.0,
            sourceUrl: 'https://mcec.com.au/events/mining-energy-2026',
        },
    });
    await prisma.eventResearch.upsert({
        where: { eventId: event1.id },
        update: {},
        create: {
            eventId: event1.id,
            summary: 'High-profile 3-day energy summit gathering international keynote speakers, ASX-listed mining executives, overseas delegations, and investors at MCEC South Wharf. Substantial VIP airport transfer and speaker transportation requirements.',
            transportationDemandSignals: JSON.stringify([
                'Over 60 international keynote speakers and VIP delegates arriving via Tullamarine',
                'Official Gala Dinner at Crown Palladium requiring VIP group shuttle transfers',
                'High percentage of C-suite attendees staying across Southbank and CBD luxury hotels',
            ]),
            vipExecutiveRelevance: 'Very High (C-suite mining executives, government officials, international delegates)',
            groupTransferPotential: 'High (Mercedes V-Class and luxury coaches for executive panels and delegation dinners)',
            airportTransferRelevance: 'Very High (Flight tracking for incoming international and interstate speakers)',
            evidenceSources: JSON.stringify([
                { title: 'MCEC Event Calendar - Asia-Pacific Energy Summit', url: 'https://mcec.com.au', snippet: '2,800 anticipated delegates over 3 days, 60+ keynote speakers.' },
            ]),
            confidenceScore: 0.93,
        },
    });
    await prisma.eventOpportunity.upsert({
        where: { eventId: event1.id },
        update: {},
        create: {
            eventId: event1.id,
            score: 91.0,
            scoreBreakdown: JSON.stringify({
                eventSize: 19, // 19/20 (2,800 delegates)
                transportDemand: 24, // 24/25 (High VIP and speaker volume)
                vipRelevance: 15, // 15/15 (C-level and government)
                groupTransferPotential: 14, // 14/15 (VIP dinners & shuttles)
                locationMatch: 10, // 10/10 (MCEC South Wharf)
                eventTypeMatch: 9, // 9/10 (Premier industry conference)
            }),
            priority: 'HIGH',
            whyRelevant: 'Major MCEC conference with 60+ international keynote speakers and 2,800 executive delegates. Substantial opportunity for VIP airport transfers, hotel-to-venue executive shuttles, and gala dinner transfers.',
            recommendedServices: JSON.stringify(['Corporate Event & Conference Transfers', 'VIP & Luxury Private Transportation', 'Group Transfers & Luxury People Movers']),
            outreachAngle: 'Offering dedicated VIP speaker airport transfers and executive group transit coordination between Southbank hotels and MCEC.',
        },
    });
    const eventContact1 = await prisma.contact.upsert({
        where: { id: 'contact-event-mining' },
        update: {},
        create: {
            id: 'contact-event-mining',
            eventId: event1.id,
            fullName: 'Elena Rostova',
            firstName: 'Elena',
            lastName: 'Rostova',
            jobTitle: 'Head of Event Operations & Logistics',
            department: 'Event Management',
            seniorityLevel: 'DIRECTOR',
            email: 'elena.rostova@globalenergyexpos.com.au',
            emailSource: 'OFFICIAL_WEBSITE',
            emailConfidence: 0.9,
            verificationStatus: 'VERIFIED',
            isPrimaryContact: true,
        },
    });
    await prisma.emailDraft.upsert({
        where: { id: 'draft-event-mining-1' },
        update: {},
        create: {
            id: 'draft-event-mining-1',
            eventId: event1.id,
            contactId: eventContact1.id,
            recipientName: 'Elena Rostova',
            recipientEmail: 'elena.rostova@globalenergyexpos.com.au',
            recipientRole: 'Head of Event Operations & Logistics',
            subject: 'VIP Speaker & Executive Ground Transportation for Asia-Pacific Mining & Energy Summit at MCEC',
            fixedContent: 'Opal Chauffeurs provides professional event fleet coordination, flight-tracked airport pickups, and luxury private transfers across Melbourne, with extensive experience supporting major conferences at MCEC, Crown, and premier venues.',
            dynamicContent: 'With the upcoming Asia-Pacific Mining & Energy Leadership Summit at MCEC welcoming international keynote speakers and executive delegates, Opal Chauffeurs can provide dedicated VIP airport transfers and coordinated group shuttle logistics.',
            fullBodyText: `Dear Elena,

I hope your preparations for the Asia-Pacific Mining & Energy Leadership Summit at MCEC are progressing smoothly.

With over 60 international keynote speakers and corporate delegations attending the summit in South Wharf, ensuring seamless, punctual, and comfortable ground transportation is an important part of the guest experience.

Opal Chauffeurs is a Melbourne-based premium chauffeur and event transportation provider. We assist event directors and organizers with comprehensive ground transport support:

• Keynote Speaker & VIP Airport Transfers: Inside-terminal meet-and-greet at Melbourne Airport with real-time flight tracking, ensuring zero waiting time regardless of flight schedule changes.
• Luxury Group People Movers: Mercedes-Benz V-Class vehicles accommodating VIP panels and dinner delegations traveling between Melbourne CBD/Southbank hotels and MCEC.
• Dedicated Event Transport Coordinator: Single point of contact for your operations team to manage speaker arrival rosters and last-minute schedule adjustments.

If your logistics team is currently finalizing speaker or VIP transportation arrangements for the summit, we would be pleased to provide a tailored quote and vehicle availability overview.

Would you be open to a brief conversation this week?

Warm regards,

Corporate Partnerships Team
Opal Chauffeurs
Web: https://www.opalchauffeurs.com.au/
Email: book@opalchauffeurs.com.au | Direct: +61 432 000 718`,
            personalizationReasoning: 'Specifically references the MCEC South Wharf venue, 60+ keynote speakers, flight-tracked airport pickups, and Mercedes V-Class group dinner transfers for the energy conference.',
            aiEvidenceCited: JSON.stringify(['MCEC South Wharf venue', 'Keynote speaker flight arrivals', 'Head of event logistics role']),
            status: 'READY_FOR_REVIEW',
        },
    });
    // 7. Seed System Settings (Dynamic scoring weights and AI configurations)
    const systemSettingsData = [
        {
            category: 'SCORING_WEIGHTS',
            key: 'corporate_scoring_weights',
            value: JSON.stringify({
                companySize: { weight: 20, description: 'Employee count and enterprise scale' },
                locationRelevance: { weight: 15, description: 'Proximity to active hubs and CBD' },
                travelDemand: { weight: 20, description: 'Frequency of flights and multi-office travel' },
                executiveActivity: { weight: 15, description: 'Presence of C-suite and leadership team' },
                eventsVipActivity: { weight: 15, description: 'Hosting of corporate dinners and galas' },
                serviceMatch: { weight: 10, description: 'Alignment with Opal luxury fleet' },
                businessVerification: { weight: 5, description: 'Publicly verified business standing' },
            }),
            description: 'Transparent 0-100 corporate opportunity scoring factor weightings',
        },
        {
            category: 'SCORING_WEIGHTS',
            key: 'event_scoring_weights',
            value: JSON.stringify({
                eventSize: { weight: 20, description: 'Total expected attendees' },
                transportDemand: { weight: 25, description: 'Airport and inter-venue travel volume' },
                vipRelevance: { weight: 15, description: 'Presence of keynote speakers & executives' },
                groupTransferPotential: { weight: 15, description: 'Requirement for multi-passenger vans' },
                locationMatch: { weight: 10, description: 'Venue in active service zone' },
                eventTypeMatch: { weight: 10, description: 'Conference / Gala / Trade Show match' },
                timingUrgency: { weight: 5, description: 'Event date proximity (7-90 days)' },
            }),
            description: 'Transparent 0-100 event opportunity scoring factor weightings',
        },
        {
            category: 'AI_CONFIG',
            key: 'ai_engine_parameters',
            value: JSON.stringify({
                primaryProvider: 'claude',
                modelPrimary: 'claude-3-5-sonnet-20241022',
                modelFast: 'claude-3-5-haiku-20241022',
                temperature: 0.3,
                strictHumanInTheLoop: true,
                prohibitUnauthorizedDiscounts: true,
            }),
            description: 'Claude AI API configuration and strict safety guardrails',
        },
        {
            category: 'SCHEDULER',
            key: 'background_monitoring_schedule',
            value: JSON.stringify({
                corporateDiscoveryFrequencyHours: 24,
                eventDiscoveryFrequencyHours: 12,
                followUpCheckFrequencyHours: 6,
                inboxMonitorFrequencyMinutes: 30,
                activeLocationsOnly: true,
            }),
            description: 'Scheduled background monitoring intervals',
        },
    ];
    for (const s of systemSettingsData) {
        await prisma.systemSettings.upsert({
            where: { key: s.key },
            update: s,
            create: s,
        });
    }
    console.log('✅ System Settings & Scoring Configurations seeded');
    // 8. Seed Background Jobs
    const backgroundJobsData = [
        {
            jobType: 'CORPORATE_DISCOVERY',
            title: 'Melbourne & Interstate Corporate Opportunity Scanner',
            frequency: 'DAILY',
            lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
            nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 21),
            status: 'IDLE',
            lastResultSummary: 'Scanned Melbourne CBD, Southbank & Docklands. Discovered 12 candidate enterprises, qualified 8 high-priority opportunities.',
            itemsProcessed: 12,
            errorsCount: 0,
            isEnabled: true,
        },
        {
            jobType: 'EVENT_DISCOVERY',
            title: 'Active Locations Event & Conference Intelligence Monitor',
            frequency: 'DAILY',
            lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
            nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 19),
            status: 'IDLE',
            lastResultSummary: 'Monitored MCEC, Marvel Stadium & Melbourne Park. Detected 6 high-value upcoming events within 90-day window.',
            itemsProcessed: 6,
            errorsCount: 0,
            isEnabled: true,
        },
        {
            jobType: 'FOLLOW_UP_CHECK',
            title: 'Automated Follow-Up Cadence & Stop-Rule Validator',
            frequency: 'DAILY',
            lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 1),
            nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 5),
            status: 'IDLE',
            lastResultSummary: 'Checked 14 active outreach threads. Verified 0 stop conditions triggered, 2 follow-ups queued for admin review.',
            itemsProcessed: 14,
            errorsCount: 0,
            isEnabled: true,
        },
        {
            jobType: 'INBOX_MONITOR',
            title: 'Inbound Reply Tracker & AI Intent Classifier',
            frequency: 'HOURLY',
            lastRunAt: new Date(Date.now() - 1000 * 60 * 25),
            nextRunAt: new Date(Date.now() + 1000 * 60 * 35),
            status: 'IDLE',
            lastResultSummary: 'Synchronized email responses. Classified 1 new meeting request from financial services firm.',
            itemsProcessed: 3,
            errorsCount: 0,
            isEnabled: true,
        },
    ];
    for (const b of backgroundJobsData) {
        await prisma.backgroundJob.upsert({
            where: { jobType: b.jobType },
            update: b,
            create: b,
        });
    }
    console.log('✅ Background Jobs & Schedulers seeded');
    // 9. Activity Log entries
    await prisma.activityLog.createMany({
        data: [
            {
                action: 'DISCOVERY',
                entityType: 'COMPANY',
                entityId: company1.id,
                actor: 'AI_ENGINE',
                description: 'Discovered Telstra Enterprise Solutions in Melbourne Exhibition Street with high corporate travel potential.',
                details: JSON.stringify({ score: 92, industry: 'Telecommunications & Enterprise IT' }),
            },
            {
                action: 'RESEARCH',
                entityType: 'COMPANY',
                entityId: company1.id,
                actor: 'AI_ENGINE',
                description: 'Completed in-depth structured research: 18 national offices, heavy Tullamarine airport transit detected.',
                details: JSON.stringify({ confidence: 0.94 }),
            },
            {
                action: 'DRAFT_GENERATED',
                entityType: 'DRAFT',
                entityId: 'draft-telstra-1',
                actor: 'AI_ENGINE',
                description: 'Generated 2-layer personalized outreach email for Sarah Jenkins (Head of Executive Operations).',
                details: JSON.stringify({ status: 'READY_FOR_REVIEW' }),
            },
            {
                action: 'DISCOVERY',
                entityType: 'EVENT',
                entityId: event1.id,
                actor: 'AI_ENGINE',
                description: 'Detected upcoming Asia-Pacific Mining & Energy Leadership Summit 2026 at MCEC South Wharf.',
                details: JSON.stringify({ score: 91, attendees: 2800 }),
            },
        ],
    });
    console.log('✅ Audit and Activity Logs recorded');
    // 10. Initial Notifications
    await prisma.notification.createMany({
        data: [
            {
                type: 'DRAFT_READY',
                title: 'New Outreach Draft Ready for Approval',
                message: 'Personalized email drafted for Sarah Jenkins (Telstra Enterprise Solutions). Opportunity score: 92/100.',
                linkUrl: '/review',
                isRead: false,
            },
            {
                type: 'HIGH_PRIORITY_EVENT',
                title: 'High-Priority Event Detected at MCEC',
                message: 'Asia-Pacific Mining & Energy Leadership Summit (2,800 delegates) requires VIP speaker transfers.',
                linkUrl: '/events',
                isRead: false,
            },
            {
                type: 'HIGH_PRIORITY_COMPANY',
                title: 'King & Wood Mallesons Melbourne Qualified',
                message: 'Top-tier law firm at Collins Arch scored 88.5/100. Partner travel and airport demand detected.',
                linkUrl: '/companies/comp-kwm-vic',
                isRead: false,
            },
        ],
    });
    console.log('✅ In-App Notifications seeded');
    console.log('🚀 Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
