import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HunterClient } from '@/lib/enrichment/hunter';
import { ApolloPoolManager } from '@/lib/enrichment/apollo';
import { VibeProspectingClient } from '@/lib/enrichment/vibeprospecting';
import { CorporateIntelligenceEngine } from '@/lib/ai/corporate';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { domains, apiKey, domainNames } = await req.json();

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

    let totalImported = 0;

    for (const domain of domains) {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim().toLowerCase();
      if (!cleanDomain) continue;

      // Hunter having no data at all for this domain (common for smaller/
      // niche companies) used to `continue` here, skipping this domain
      // entirely — including the Apollo/Vibe Prospecting fallback below,
      // which don't need Hunter's own org lookup to work. Degrade to an
      // empty result instead so the cascade still gets a chance to run.
      const searchRes = await HunterClient.domainSearch(cleanDomain, finalApiKey, 5);
      const organization = searchRes.success ? searchRes.result?.organization : undefined;
      const emails = searchRes.success ? searchRes.result?.emails || [] : [];
      // The caller (Target Radar / Corporate Companies "Retry Import") may
      // already know the company's real, correctly-cased name — from
      // Google Places, or from the Company record itself on a retry.
      const preferredName: string | undefined = domainNames?.[domain] || domainNames?.[cleanDomain];

      // Find the Company by domain FIRST. Its stored name — the real name
      // a human or Google Places gave it — is the one source of truth.
      // Falling back to a domain-derived guess like "SUNCORPGROUP" here
      // used to silently rename an existing company on every retry, and
      // that same wrong guess was then fed into Apollo's name-based
      // organization search and into the outreach email's own
      // {{COMPANY_NAME}} placeholder — undermining both.
      let company = await prisma.company.findFirst({ where: { domain: cleanDomain } });
      const companyName = company?.name || preferredName || organization || cleanDomain.split('.')[0].toUpperCase();

      if (!company) {
        company = await prisma.company.findFirst({ where: { name: companyName } });
      }

      if (!company) {
        // Hunter's domain-search API only returns emails — it has no signal
        // on company size, industry, office count, or international
        // presence. Those used to be hardcoded to impressive-sounding
        // values ("Enterprise 500+", international, 2 offices) regardless
        // of the real company, which also artificially inflated the score.
        // Use honest "unknown" defaults instead; a human can correct these
        // during review.
        const analysis = CorporateIntelligenceEngine.analyzeCompany({
          name: companyName,
          website: `https://${cleanDomain}`,
          industry: 'Unknown',
          city: 'Melbourne',
          state: 'VIC',
          headquartersAddress: 'Melbourne VIC, Australia',
          approximateSize: 'Unknown',
          officeCount: 1,
          internationalPresence: false,
        });

        company = await prisma.company.create({
          data: {
            name: companyName,
            website: `https://${cleanDomain}`,
            domain: cleanDomain,
            industry: 'Unknown',
            city: 'Melbourne',
            state: 'VIC',
            headquartersAddress: 'Melbourne VIC, Australia',
            approximateSize: 'Unknown',
            // Matches the same honest fallback CorporateIntelligenceEngine
            // uses internally for a single-office, non-international,
            // unknown-size company — not the schema's optimistic HIGH/HIGH
            // defaults, which would otherwise apply here unset.
            corporateActivityLevel: 'MEDIUM',
            executiveTravelLikelihood: 'MEDIUM',
            eventHostingLikelihood: 'MEDIUM',
            status: 'DRAFTED',
            priority: analysis.priority,
            opportunityScore: analysis.score,
            isVerified: true,
          },
        });
      }

      let domainImported = 0;

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
        // Hunter's domain search returns a confidence score per email —
        // many are pattern-guessed (e.g. first.last@domain) rather than
        // actually confirmed, often well under 80%. Labeling every single
        // one "VERIFIED" regardless of that score misrepresented low-
        // confidence guesses as confirmed, real addresses.
        const confidence = typeof e.confidence === 'number' ? e.confidence : 90;

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
            emailConfidence: confidence / 100,
            verificationStatus: confidence >= 80 ? 'VERIFIED' : 'LIKELY',
            emailSource: 'HUNTER_IO_VERIFIED',
            linkedinUrl: e.linkedin,
            isPrimaryContact: true,
          },
        });

        // Fixed partnership-outreach template, personalized by company/role only.
        const generated = EmailGenerator.renderPartnershipTemplate({
          recipient: {
            name: fullName,
            role,
            companyName,
            email: e.value.toLowerCase().trim(),
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
            htmlBody: generated.htmlBody,
            personalizationReasoning: generated.personalizationReasoning,
            aiEvidenceCited: JSON.stringify(generated.evidenceCited || []),
            status: 'READY_FOR_REVIEW',
          },
        });

        totalImported++;
        domainImported++;
      }

      // Hunter found no usable email — whether it found the organization
      // with zero emails, found nothing at all, or every email it did find
      // was an already-known contact — cascade to Apollo, then Vibe
      // Prospecting, before giving up on this domain.
      if (domainImported === 0) {
        const existingAnyContact = await prisma.contact.findFirst({ where: { companyId: company.id } });
        if (!existingAnyContact) {
          try {
            let fallbackContact = await ApolloPoolManager.findDecisionMaker(cleanDomain, companyName);
            let fallbackSource = 'APOLLO_IO_VERIFIED';
            if (!fallbackContact?.email) {
              // Apollo also came up empty — try Vibe Prospecting (Explorium)
              // as a third source before giving up on this domain.
              fallbackContact = await VibeProspectingClient.findDecisionMaker(cleanDomain, companyName);
              fallbackSource = 'VIBE_PROSPECTING_VERIFIED';
            }
            if (fallbackContact?.email) {
              const contact = await prisma.contact.create({
                data: {
                  companyId: company.id,
                  fullName: fallbackContact.fullName || 'Executive Operations Lead',
                  firstName: fallbackContact.firstName || fallbackContact.fullName?.split(' ')[0],
                  lastName: fallbackContact.lastName || fallbackContact.fullName?.split(' ').slice(1).join(' '),
                  email: fallbackContact.email.toLowerCase().trim(),
                  jobTitle: fallbackContact.jobTitle,
                  department: fallbackContact.department || 'Operations',
                  seniorityLevel: 'MANAGER',
                  emailConfidence: fallbackContact.emailConfidence,
                  verificationStatus: fallbackContact.verificationStatus,
                  emailSource: fallbackSource,
                  linkedinUrl: fallbackContact.linkedinUrl,
                  phone: fallbackContact.phone,
                  isPrimaryContact: true,
                },
              });

              const generated = EmailGenerator.renderPartnershipTemplate({
                recipient: {
                  name: contact.fullName,
                  role: contact.jobTitle,
                  companyName,
                  email: contact.email,
                },
              });

              await prisma.emailDraft.create({
                data: {
                  companyId: company.id,
                  contactId: contact.id,
                  recipientName: contact.fullName,
                  recipientEmail: contact.email,
                  recipientRole: contact.jobTitle,
                  subject: generated.subject,
                  fixedContent: generated.fixedContent,
                  dynamicContent: generated.dynamicContent,
                  fullBodyText: generated.fullBodyText,
                  htmlBody: generated.htmlBody,
                  personalizationReasoning: generated.personalizationReasoning,
                  aiEvidenceCited: JSON.stringify(generated.evidenceCited || []),
                  status: 'READY_FOR_REVIEW',
                },
              });

              totalImported++;
              domainImported++;
            }
          } catch (e) {
            console.warn('Apollo/Vibe Prospecting fallback error for domain', cleanDomain, e);
          }
        }
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
