import { prisma } from '@/lib/prisma';
import { ApolloPoolManager } from '@/lib/enrichment/apollo';
import { GooglePlacesClient } from '@/lib/discovery/google-places';
import { OpenStreetMapClient } from '@/lib/discovery/openstreetmap';
import { HunterClient } from '@/lib/enrichment/hunter';
import { CorporateIntelligenceEngine } from '@/lib/ai/corporate';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity, createNotification } from '@/lib/activity-logger';

export interface CompanyDiscoveryResult {
  locationsScanned: number;
  candidatesFound: number;
  companiesImported: number;
  contactsFound: number;
  notes: string[];
}

const MAX_NEW_COMPANIES_PER_LOCATION = 5; // keep each run bounded (cost + volume control)
const MAX_CONTACTS_PER_COMPANY = 2;

/**
 * Real, live corporate discovery: scans every active ServiceLocation via
 * Apollo + Google Places (if configured) + OpenStreetMap, skips anything
 * already in the database, and for genuinely new companies with a website
 * runs Hunter enrichment to pull real contacts and generate AI drafts —
 * the same pipeline as the manual "Import & Pitch" button, just run
 * automatically across all configured locations.
 */
export async function discoverCompaniesForActiveLocations(): Promise<CompanyDiscoveryResult> {
  const notes: string[] = [];
  const locations = await prisma.serviceLocation.findMany({ where: { isActive: true } });

  if (locations.length === 0) {
    notes.push('No active service locations configured — add one under Service Locations before running discovery.');
    return { locationsScanned: 0, candidatesFound: 0, companiesImported: 0, contactsFound: 0, notes };
  }

  const existing = await prisma.company.findMany({ select: { name: true, domain: true } });
  const existingNames = new Set(existing.map((c) => c.name.toLowerCase().trim()));
  const existingDomains = new Set(existing.map((c) => c.domain?.toLowerCase().trim()).filter(Boolean) as string[]);

  const hunterSetting = await prisma.systemSettings.findUnique({ where: { key: 'hunter_api_key' } });
  const hunterKey = hunterSetting?.value || process.env.HUNTER_API_KEY || '';
  if (!hunterKey) {
    notes.push('Hunter API key not configured — new companies will be added without contacts/drafts.');
  }

  const businessProfile = await prisma.businessProfile.findFirst();
  const bProfile = {
    companyName: businessProfile?.companyName || 'Opal Chauffeurs',
    tradingName: businessProfile?.tradingName,
    website: businessProfile?.website || 'https://www.opalchauffeurs.com.au/',
    description: businessProfile?.description || 'Premium chauffeur transportation service based in Melbourne, Australia.',
    brandPositioning: businessProfile?.brandPositioning || 'Melbourne’s premier executive transport partner. Punctual, discreet, 24/7 reliability.',
    emailSignature: businessProfile?.emailSignature || 'Warm regards,\n\nInaya\nCorporate Partnerships Team\nOpal Chauffeurs',
    collaborationOffer: businessProfile?.collaborationOffer || 'Introducing Opal Chauffeurs as your corporate transport partner.',
  };

  let candidatesFound = 0;
  let companiesImported = 0;
  let contactsFound = 0;

  for (const loc of locations) {
    const locationQuery = `${loc.cityName}, ${loc.state}`;
    const candidates: any[] = [];

    try {
      candidates.push(...(await ApolloPoolManager.searchCompaniesByLocation(locationQuery, 10)));
    } catch (e: any) {
      notes.push(`Apollo search failed for ${locationQuery}: ${e?.message || 'unknown error'}`);
    }

    try {
      const googleKey = process.env.GOOGLE_MAPS_API_KEY || '';
      if (googleKey) {
        candidates.push(...(await GooglePlacesClient.searchCompaniesByLocation(locationQuery, googleKey)));
      }
    } catch (e: any) {
      notes.push(`Google Places search failed for ${locationQuery}: ${e?.message || 'unknown error'}`);
    }

    try {
      candidates.push(...(await OpenStreetMapClient.searchCompaniesByLocation(locationQuery)));
    } catch (e: any) {
      notes.push(`OpenStreetMap search failed for ${locationQuery}: ${e?.message || 'unknown error'}`);
    }

    const seenInBatch = new Set<string>();
    const newCandidates = candidates.filter((c) => {
      const name = (c.name || '').toLowerCase().trim();
      const domain = (c.domain || '').toLowerCase().trim();
      if (!name || seenInBatch.has(name)) return false;
      seenInBatch.add(name);
      if (existingNames.has(name)) return false;
      if (domain && existingDomains.has(domain)) return false;
      return true;
    });

    candidatesFound += newCandidates.length;

    for (const cand of newCandidates.slice(0, MAX_NEW_COMPANIES_PER_LOCATION)) {
      if (!cand.domain) continue; // need a website to enrich real contacts

      try {
        const size = cand.size && cand.size !== 'Unknown' ? cand.size : 'Medium (50-200)';
        const analysis = CorporateIntelligenceEngine.analyzeCompany({
          name: cand.name,
          website: `https://${cand.domain}`,
          industry: cand.industry || 'Corporate & Professional Services',
          city: loc.cityName,
          state: loc.state,
          headquartersAddress: cand.address || `${loc.cityName}, ${loc.state}`,
          approximateSize: size,
          officeCount: 1,
          internationalPresence: false,
        });

        const company = await prisma.company.create({
          data: {
            name: cand.name,
            website: `https://${cand.domain}`,
            domain: cand.domain,
            industry: cand.industry || 'Corporate & Professional Services',
            city: loc.cityName,
            state: loc.state,
            headquartersAddress: cand.address || `${loc.cityName}, ${loc.state}`,
            approximateSize: size,
            status: 'DISCOVERED',
            priority: analysis.priority,
            opportunityScore: analysis.score,
            isVerified: false,
          },
        });

        existingNames.add(cand.name.toLowerCase().trim());
        existingDomains.add(cand.domain.toLowerCase().trim());
        companiesImported++;

        if (hunterKey) {
          const hunterResult = await HunterClient.domainSearch(cand.domain, hunterKey, MAX_CONTACTS_PER_COMPANY);
          if (hunterResult.success && hunterResult.result?.emails?.length) {
            for (const e of hunterResult.result.emails.slice(0, MAX_CONTACTS_PER_COMPANY)) {
              if (!e.value) continue;
              const existingContact = await prisma.contact.findFirst({
                where: { email: e.value.toLowerCase().trim() },
              });
              if (existingContact) continue;

              const fullName = e.firstName || e.lastName ? `${e.firstName} ${e.lastName}`.trim() : 'Executive Operations Lead';
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
                  emailConfidence: (e.confidence || 90) / 100,
                  verificationStatus: 'VERIFIED',
                  linkedinUrl: e.linkedin || undefined,
                  isPrimaryContact: true,
                },
              });
              contactsFound++;

              const draft = await EmailGenerator.generateEmailSmart({
                businessProfile: bProfile,
                recipient: { name: fullName, role, companyName: cand.name, email: e.value },
                context: {
                  type: 'COMPANY',
                  industry: cand.industry,
                  location: `${loc.cityName}, ${loc.state}`,
                  whyRelevant: analysis.whyRelevant,
                  recommendedServices: analysis.recommendedServices,
                },
              });

              await prisma.emailDraft.create({
                data: {
                  companyId: company.id,
                  contactId: contact.id,
                  recipientName: fullName,
                  recipientEmail: e.value.toLowerCase().trim(),
                  recipientRole: role,
                  subject: draft.subject,
                  fixedContent: draft.fixedContent,
                  dynamicContent: draft.dynamicContent,
                  fullBodyText: draft.fullBodyText,
                  personalizationReasoning: draft.personalizationReasoning,
                  aiEvidenceCited: JSON.stringify(draft.evidenceCited || []),
                  status: 'READY_FOR_REVIEW',
                },
              });
            }
          }
        }
      } catch (err: any) {
        notes.push(`${cand.name}: ${err?.message || 'failed to import'}`);
      }
    }
  }

  if (companiesImported > 0) {
    await logActivity({
      action: 'DISCOVERY',
      entityType: 'COMPANY',
      actor: 'BACKGROUND_SCHEDULER',
      description: `Automated discovery scanned ${locations.length} active location(s), found ${candidatesFound} new candidates, imported ${companiesImported} with ${contactsFound} contact(s).`,
      details: { candidatesFound, companiesImported, contactsFound },
    });
    await createNotification({
      type: 'CONTACT_FOUND',
      title: `Auto-Discovery: ${companiesImported} New Companies Found`,
      message: `${companiesImported} new corporate targets discovered across your active service locations. ${contactsFound} contact(s) with drafts ready for review.`,
      linkUrl: '/companies',
    });
  }

  return {
    locationsScanned: locations.length,
    candidatesFound,
    companiesImported,
    contactsFound,
    notes,
  };
}
