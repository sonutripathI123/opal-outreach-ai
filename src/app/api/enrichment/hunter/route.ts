import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HunterClient } from '@/lib/enrichment/hunter';
import { CorporateIntelligenceEngine } from '@/lib/ai/corporate';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { domains, apiKey } = await req.json();

    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json({ error: 'Domains array is required' }, { status: 400 });
    }

    let finalApiKey = apiKey;
    if (!finalApiKey) {
      const setting = await prisma.systemSettings.findUnique({
        where: { key: 'hunter_api_key' },
      });
      finalApiKey = setting?.value || process.env.HUNTER_API_KEY;
    }

    if (!finalApiKey) {
      return NextResponse.json(
        { error: 'Hunter.io API key not provided or configured in /settings' },
        { status: 400 }
      );
    }

    const profile = await prisma.businessProfile.findFirst();
    const bProfile = profile || {
      companyName: 'Opal Chauffeurs',
      tradingName: 'Esteem Travel Service Pty Ltd',
      website: 'https://www.opalchauffeurs.com.au/',
      description: 'Premium chauffeur transportation service based in Melbourne, Australia.',
      brandPositioning: 'Melbourne’s premier executive transport partner. Punctual, discreet, 24/7 reliability.',
      emailSignature: `Warm regards,\n\nInaya\nCorporate Partnerships Team\nOpal Chauffeurs\nWeb: https://www.opalchauffeurs.com.au/\nEmail: book@opalchauffeurs.com.au | Direct: +61 432 000 718`,
      collaborationOffer: 'Introducing Opal Chauffeurs as your corporate transport partner.',
    };

    let totalImported = 0;

    for (const domain of domains) {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim().toLowerCase();
      if (!cleanDomain) continue;

      const searchRes = await HunterClient.domainSearch(cleanDomain, finalApiKey, 5);
      if (!searchRes.success || !searchRes.result) continue;

      const { organization, emails } = searchRes.result;
      const companyName = organization || cleanDomain.split('.')[0].toUpperCase();

      // Find or create Company
      let company = await prisma.company.findFirst({
        where: {
          OR: [
            { domain: cleanDomain },
            { name: companyName },
          ],
        },
      });

      if (!company) {
        const analysis = CorporateIntelligenceEngine.analyzeCompany({
          name: companyName,
          website: `https://${cleanDomain}`,
          industry: 'Corporate & Financial Services',
          city: 'Melbourne',
          state: 'VIC',
          headquartersAddress: 'Melbourne VIC, Australia',
          approximateSize: 'Enterprise (500+)',
          officeCount: 2,
          internationalPresence: true,
        });

        company = await prisma.company.create({
          data: {
            name: companyName,
            website: `https://${cleanDomain}`,
            domain: cleanDomain,
            industry: 'Corporate & Financial Services',
            city: 'Melbourne',
            state: 'VIC',
            headquartersAddress: 'Melbourne VIC, Australia',
            approximateSize: 'Enterprise (500+)',
            corporateActivityLevel: 'HIGH',
            executiveTravelLikelihood: 'HIGH',
            eventHostingLikelihood: 'MEDIUM',
            status: 'DRAFTED',
            priority: analysis.priority,
            opportunityScore: analysis.score,
            isVerified: true,
          },
        });
      }

      // Add contacts & create drafts
      for (const e of emails) {
        if (!e.value) continue;

        // Check if contact already exists
        const existingContact = await prisma.contact.findFirst({
          where: { email: e.value.toLowerCase().trim() },
        });

        if (existingContact) continue;

        const fullName = (e.firstName || e.lastName) ? `${e.firstName} ${e.lastName}`.trim() : 'Executive Operations Lead';
        const role = e.position || 'Corporate Travel & Operations';

        const contact = await prisma.contact.create({
          data: {
            companyId: company.id,
            fullName,
            firstName: e.firstName || fullName.split(' ')[0],
            lastName: e.lastName || fullName.split(' ').slice(1).join(' '),
            email: e.value.toLowerCase().trim(),
            jobTitle: role,
            department: e.department || 'Executive Management',
            seniorityLevel: 'MANAGER',
            emailConfidence: (e.confidence || 90) / 100,
            verificationStatus: 'VERIFIED',
            linkedinUrl: e.linkedin,
            isPrimaryContact: true,
          },
        });

        // Generate tailored draft
        const generated = EmailGenerator.generateEmail({
          businessProfile: {
            companyName: bProfile.companyName || 'Opal Chauffeurs',
            tradingName: bProfile.tradingName,
            website: bProfile.website || 'https://www.opalchauffeurs.com.au/',
            description: bProfile.description || 'Premium chauffeur transportation service based in Melbourne, Australia.',
            brandPositioning: bProfile.brandPositioning || 'Melbourne’s premier executive transport partner. Punctual, discreet, 24/7 reliability.',
            emailSignature: bProfile.emailSignature || 'Warm regards,\n\nInaya\nCorporate Partnerships Team\nOpal Chauffeurs',
            collaborationOffer: bProfile.collaborationOffer || 'Introducing Opal Chauffeurs as your corporate transport partner.',
          },
          recipient: {
            name: fullName,
            role,
            companyName,
            email: e.value.toLowerCase().trim(),
          },
          context: {
            type: 'COMPANY',
            industry: 'Corporate & Financial Services',
            location: 'Melbourne, VIC',
            signals: [`${companyName} presence in Melbourne`, `Executive flight transit demand`, `${role} coordination`],
          },
        });

        await prisma.emailDraft.create({
          data: {
            companyId: company.id,
            contactId: contact.id,
            recipientName: fullName,
            recipientEmail: e.value.toLowerCase().trim(),
            recipientRole: role,
            subject: generated.subject,
            fixedContent: generated.fixedContent,
            dynamicContent: generated.dynamicContent,
            fullBodyText: generated.fullBodyText,
            personalizationReasoning: generated.personalizationReasoning,
            aiEvidenceCited: JSON.stringify(generated.evidenceCited || []),
            status: 'READY_FOR_REVIEW',
          },
        });

        totalImported++;
      }
    }

    if (totalImported > 0) {
      await logActivity({
        action: 'DISCOVERY',
        entityType: 'COMPANY',
        actor: 'AI_ENGINE',
        description: `Hunter.io Live Auto-Discovery: Enriched ${domains.length} domains and created ${totalImported} tailored outreach drafts.`,
        details: { domainsCount: domains.length, importedCount: totalImported },
      });

      await createNotification({
        type: 'DRAFT_READY',
        title: `Hunter.io Enrichment: ${totalImported} New Drafts Ready`,
        message: `Verified decision makers extracted via Hunter.io API.`,
        linkUrl: '/review',
      });
    }

    return NextResponse.json({
      success: true,
      importedCount: totalImported,
      message: `Enriched ${domains.length} domains. ${totalImported} verified contacts and tailored drafts created!`,
    });
  } catch (error: any) {
    console.error('Hunter enrichment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to enrich domains with Hunter' },
      { status: 500 }
    );
  }
}
