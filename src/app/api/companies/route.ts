import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CorporateIntelligenceEngine } from '@/lib/ai/corporate';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { ApolloPoolManager } from '@/lib/enrichment/apollo';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const city = searchParams.get('city');
    const industry = searchParams.get('industry');
    const minScore = searchParams.get('minScore') ? parseFloat(searchParams.get('minScore')!) : undefined;

    const whereClause: any = {};

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }
    if (priority && priority !== 'ALL') {
      whereClause.priority = priority;
    }
    if (city && city !== 'ALL') {
      whereClause.city = city;
    }
    if (industry && industry !== 'ALL') {
      whereClause.industry = industry;
    }
    if (minScore !== undefined) {
      whereClause.opportunityScore = { gte: minScore };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
      ];
    }

    const companies = await prisma.company.findMany({
      where: whereClause,
      include: {
        research: true,
        opportunity: true,
        contacts: true,
        emailDrafts: {
          orderBy: { createdAt: 'desc' },
        },
        sentEmails: true,
        replies: true,
      },
      orderBy: { opportunityScore: 'desc' },
    });

    return NextResponse.json({ companies });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      website,
      industry,
      subIndustry,
      city = 'Melbourne',
      state = 'VIC',
      headquartersAddress,
      approximateSize = 'Medium (50-200)',
      employeeCountEstimate,
      officeCount = 1,
      internationalPresence = false,
      contactName,
      contactRole,
      contactEmail,
    } = body;

    if (!name || !website || !industry) {
      return NextResponse.json({ error: 'Name, website, and industry are required' }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.company.findFirst({
      where: {
        OR: [
          { name: { equals: name } },
          { website: { contains: website.replace('https://', '').replace('http://', '').replace('www.', '') } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: `Company '${name}' already exists in database` }, { status: 409 });
    }

    // Run AI Intelligence & Scoring Engine
    const analysis = CorporateIntelligenceEngine.analyzeCompany({
      name,
      website,
      industry,
      subIndustry,
      city,
      state,
      headquartersAddress,
      approximateSize,
      employeeCountEstimate: employeeCountEstimate ? parseInt(employeeCountEstimate) : undefined,
      officeCount: parseInt(officeCount.toString()),
      internationalPresence: Boolean(internationalPresence),
    });

    // Create Company
    const company = await prisma.company.create({
      data: {
        name,
        website,
        domain: website.replace(/https?:\/\/(www\.)?/, '').split('/')[0],
        industry,
        subIndustry,
        city,
        state,
        headquartersAddress: headquartersAddress || `${city}, ${state}`,
        approximateSize,
        employeeCountEstimate: employeeCountEstimate ? parseInt(employeeCountEstimate) : undefined,
        officeCount: parseInt(officeCount.toString()),
        internationalPresence: Boolean(internationalPresence),
        corporateActivityLevel: officeCount > 2 ? 'HIGH' : 'MEDIUM',
        executiveTravelLikelihood: officeCount > 1 || internationalPresence ? 'HIGH' : 'MEDIUM',
        eventHostingLikelihood: approximateSize.includes('Large') ? 'HIGH' : 'MEDIUM',
        status: 'DRAFTED',
        priority: analysis.priority,
        opportunityScore: analysis.score,
        isVerified: true,
      },
    });

    // Create Research
    await prisma.companyResearch.create({
      data: {
        companyId: company.id,
        summary: analysis.summary,
        businessModel: analysis.businessModel,
        detectedSignals: JSON.stringify(analysis.detectedSignals),
        evidenceSources: JSON.stringify(analysis.evidenceSources),
        confidenceLevel: analysis.confidenceLevel,
        inferredDemand: analysis.inferredDemand,
        confirmedEvidence: analysis.confirmedEvidence,
      },
    });

    // Create Opportunity
    await prisma.companyOpportunity.create({
      data: {
        companyId: company.id,
        score: analysis.score,
        scoreBreakdown: JSON.stringify(analysis.scoreBreakdown),
        priority: analysis.priority,
        whyRelevant: analysis.whyRelevant,
        recommendedServices: JSON.stringify(analysis.recommendedServices),
        targetUseCases: JSON.stringify(analysis.targetUseCases),
        confidenceScore: 0.9,
      },
    });

    // Check Apollo.io Multi-Key Pool for verified decision maker if not manually provided
    let apolloContact = null;
    if (!contactEmail) {
      try {
        apolloContact = await ApolloPoolManager.findDecisionMaker(company.domain || website, company.name);
      } catch (e) {
        console.warn('Apollo search error:', e);
      }
    }

    // We never fabricate a "travel@domain.com" guess when no real email is
    // known — sending to an invented address bounces and harms sender
    // reputation. The company is still saved for tracking; contact/draft
    // creation is skipped until a real email is found (Apollo or manual).
    const finalContactEmail = apolloContact?.email || contactEmail || null;

    let contact = null;
    let draft = null;

    if (finalContactEmail) {
      const finalContactName = apolloContact?.fullName || contactName || 'Executive Operations Desk';
      const finalContactRole = apolloContact?.jobTitle || contactRole || 'Head of Executive Operations & Corporate Travel';
      const emailSource = apolloContact ? 'APOLLO_IO_VERIFIED' : 'MANUAL_ENTRY';
      const emailConfidence = apolloContact ? apolloContact.emailConfidence : 0.95;
      const verificationStatus = apolloContact ? apolloContact.verificationStatus : 'VERIFIED';

      contact = await prisma.contact.create({
        data: {
          companyId: company.id,
          fullName: finalContactName,
          firstName: apolloContact?.firstName || finalContactName.split(' ')[0],
          lastName: apolloContact?.lastName || finalContactName.split(' ').slice(1).join(' '),
          jobTitle: finalContactRole,
          department: apolloContact?.department || 'Corporate Travel / Operations',
          seniorityLevel: 'DIRECTOR',
          email: finalContactEmail,
          emailSource,
          emailConfidence,
          verificationStatus,
          linkedinUrl: apolloContact?.linkedinUrl,
          phone: apolloContact?.phone,
          isPrimaryContact: true,
        },
      });

      // Fetch Business Profile for 2-layer email drafting
      const profile = await prisma.businessProfile.findFirst();
      const bProfile = profile || {
        companyName: 'Opal Chauffeurs',
        tradingName: 'Opal Chauffeurs',
        website: 'https://www.opalchauffeurs.com.au/',
        description: 'Premium chauffeur transportation service based in Melbourne, Australia.',
        brandPositioning: 'Melbourne’s premier executive transport partner. Punctual, discreet, 24/7 reliability.',
        emailSignature: `Warm regards,\n\nInaya\nCorporate Partnerships Team\nOpal Chauffeurs\nWeb: https://www.opalchauffeurs.com.au/\nEmail: book@opalchauffeurs.com.au | Direct: +61 432 000 718`,
        collaborationOffer: 'Introducing Opal Chauffeurs as your corporate transport partner.',
      };

      // Generate 2-Layer Personalized Outreach Draft
      const draftContent = await EmailGenerator.generateEmailSmart({
        businessProfile: bProfile,
        recipient: {
          name: contact.fullName,
          role: contact.jobTitle,
          companyName: company.name,
          email: contact.email,
        },
        context: {
          type: 'COMPANY',
          industry: company.industry,
          location: company.city,
          whyRelevant: analysis.whyRelevant,
          recommendedServices: analysis.recommendedServices,
        },
      });

      draft = await prisma.emailDraft.create({
        data: {
          companyId: company.id,
          contactId: contact.id,
          recipientName: contact.fullName,
          recipientEmail: contact.email,
          recipientRole: contact.jobTitle,
          subject: draftContent.subject,
          fixedContent: draftContent.fixedContent,
          dynamicContent: draftContent.dynamicContent,
          fullBodyText: draftContent.fullBodyText,
          personalizationReasoning: draftContent.personalizationReasoning,
          aiEvidenceCited: JSON.stringify(draftContent.evidenceCited),
          status: 'READY_FOR_REVIEW',
        },
      });
    }

    // Log Activity & Notification
    await logActivity({
      action: 'DISCOVERY',
      entityType: 'COMPANY',
      entityId: company.id,
      actor: 'ADMIN_USER',
      description: `Discovered and qualified ${company.name} (Score: ${company.opportunityScore}/100, Priority: ${company.priority}).${contact ? '' : ' No verified contact email found — add one manually before drafting outreach.'}`,
      details: { score: company.opportunityScore, priority: company.priority },
    });

    if (company.opportunityScore >= 80) {
      await createNotification({
        type: 'HIGH_PRIORITY_COMPANY',
        title: `High-Priority Enterprise Discovered: ${company.name}`,
        message: contact
          ? `${company.name} scored ${company.opportunityScore}/100. Outreach draft is waiting for your review.`
          : `${company.name} scored ${company.opportunityScore}/100. No verified contact email found yet — add one to generate an outreach draft.`,
        linkUrl: '/review',
      });
    }

    return NextResponse.json({ success: true, company, draft, contact }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: error.message || 'Failed to create company' }, { status: 500 });
  }
}
