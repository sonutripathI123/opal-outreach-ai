import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CorporateIntelligenceEngine } from '@/lib/ai/corporate';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

/**
 * Universal Multi-Platform Field Extractor
 * Automatically recognizes column headers from Apollo.io, Hunter.io, Snov.io, Anymail Finder, LinkedIn, and generic CSVs
 */
function extractValue(item: Record<string, any>, aliases: string[]): string {
  // 1. Direct match
  for (const alias of aliases) {
    if (item[alias] !== undefined && item[alias] !== null && String(item[alias]).trim() !== '') {
      return String(item[alias]).trim();
    }
  }

  // 2. Normalized alphanumeric match
  const itemKeys = Object.keys(item);
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of itemKeys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanAlias || cleanKey.includes(cleanAlias)) {
        const val = item[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Valid rows array is required for universal bulk import' }, { status: 400 });
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

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of rows) {
      // 1. Extract Company Name (Apollo, Hunter, Snov, Anymail Finder, LinkedIn, Generic)
      let companyName = extractValue(item, [
        'company_name',
        'company',
        'organization_name',
        'organization',
        'companyName',
        'account_name',
        'employer',
        'name',
        'business_name',
      ]);

      // 2. Extract Website / Domain
      let website = extractValue(item, [
        'website',
        'domain',
        'company_website',
        'company_domain',
        'url',
        'web',
        'homepage',
        'domain_name',
      ]);

      // 3. Extract Email (Direct contact email or domain desk)
      const contactEmail = extractValue(item, [
        'email',
        'email_address',
        'work_email',
        'corporate_email',
        'contact_email',
        'direct_email',
        'primary_email',
        'contactEmail',
        'value',
      ]);

      // If company name is missing but website/domain/email exists, infer company name
      if (!companyName && website) {
        const cleanDomain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        const brand = cleanDomain.split('.')[0];
        companyName = brand.charAt(0).toUpperCase() + brand.slice(1);
      } else if (!companyName && contactEmail && contactEmail.includes('@')) {
        const domainPart = contactEmail.split('@')[1];
        const brand = domainPart.split('.')[0];
        companyName = brand.charAt(0).toUpperCase() + brand.slice(1);
      }

      if (!companyName) {
        skippedCount++;
        continue;
      }

      // Format domain & website cleanly
      if (!website) {
        if (contactEmail && contactEmail.includes('@') && !contactEmail.endsWith('gmail.com') && !contactEmail.endsWith('yahoo.com')) {
          website = `https://${contactEmail.split('@')[1]}`;
        } else {
          website = `https://${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.au`;
        }
      }

      const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

      // 4. Extract Contact Name (Full name or First + Last)
      let contactFullName = extractValue(item, [
        'full_name',
        'name',
        'contact_name',
        'person_name',
        'contactName',
        'lead_name',
      ]);

      if (!contactFullName) {
        const firstName = extractValue(item, ['first_name', 'first', 'firstname', 'given_name']);
        const lastName = extractValue(item, ['last_name', 'last', 'lastname', 'family_name', 'surname']);
        if (firstName || lastName) {
          contactFullName = `${firstName} ${lastName}`.trim();
        }
      }

      if (!contactFullName) {
        contactFullName = 'Executive Travel Coordinator';
      }

      // 5. Extract Job Title / Role
      let contactRole = extractValue(item, [
        'title',
        'job_title',
        'position',
        'role',
        'designation',
        'headline',
        'contactRole',
        'occupation',
      ]);

      if (!contactRole) {
        contactRole = 'Head of Executive Operations & Corporate Travel';
      }

      // 6. Extract Location / Suburb
      const city = extractValue(item, ['city', 'location', 'suburb', 'company_city', 'person_city']) || 'Melbourne';
      const state = extractValue(item, ['state', 'region', 'province', 'company_state']) || 'VIC';
      const industry = extractValue(item, ['industry', 'sector', 'company_industry', 'category']) || 'Corporate & Professional Services';
      const size = extractValue(item, ['size', 'company_size', 'employees', 'employee_count', 'number_of_employees']) || 'Medium (50-200)';
      const linkedinUrl = extractValue(item, ['linkedin_url', 'linkedin', 'person_linkedin_url', 'profile_url', 'person_linkedin']);

      // Check duplicate
      const existing = await prisma.company.findFirst({
        where: {
          OR: [
            { name: { equals: companyName } },
            { website: { contains: domain } },
          ],
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Run Corporate Opportunity Scoring Engine
      const analysis = CorporateIntelligenceEngine.analyzeCompany({
        name: companyName,
        website: website.startsWith('http') ? website : `https://${website}`,
        industry,
        city,
        state,
        headquartersAddress: `${city}, ${state}`,
        approximateSize: size,
        officeCount: 2,
        internationalPresence: true,
      });

      // Create Company
      const company = await prisma.company.create({
        data: {
          name: companyName,
          website: website.startsWith('http') ? website : `https://${website}`,
          domain,
          industry,
          city,
          state,
          headquartersAddress: `${city}, ${state}`,
          approximateSize: size,
          corporateActivityLevel: 'HIGH',
          executiveTravelLikelihood: 'HIGH',
          eventHostingLikelihood: 'MEDIUM',
          status: 'DRAFTED',
          priority: analysis.priority,
          opportunityScore: analysis.score,
          isVerified: true,
        },
      });

      // Create Research & Opportunity
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

      // Create Contact
      const finalEmail = contactEmail || `travel@${domain}`;
      const contact = await prisma.contact.create({
        data: {
          companyId: company.id,
          fullName: contactFullName,
          firstName: contactFullName.split(' ')[0],
          lastName: contactFullName.split(' ').slice(1).join(' '),
          jobTitle: contactRole,
          department: 'Corporate Travel / Operations',
          seniorityLevel: 'DIRECTOR',
          email: finalEmail,
          emailSource: contactEmail ? 'UNIVERSAL_CSV_IMPORT' : 'SYNTHESIZED_ROLE',
          emailConfidence: contactEmail ? 0.95 : 0.8,
          verificationStatus: contactEmail ? 'VERIFIED' : 'LIKELY',
          linkedinUrl,
          isPrimaryContact: true,
        },
      });

      // Generate 2-Layer Tailored Outreach Draft
      const draftContent = EmailGenerator.generateEmail({
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

      await prisma.emailDraft.create({
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

      importedCount++;
    }

    await logActivity({
      action: 'DISCOVERY',
      entityType: 'COMPANY',
      actor: 'ADMIN_USER',
      description: `Universal bulk imported and scored ${importedCount} corporate organizations with AI outreach drafts generated.`,
      details: { importedCount, skippedCount },
    });

    if (importedCount > 0) {
      await createNotification({
        type: 'JOB_COMPLETED',
        title: `Universal CSV Import Complete: ${importedCount} Companies Added`,
        message: `${importedCount} companies and decision-makers were imported from CSV and queued in the Review Queue.`,
        linkUrl: '/review',
      });
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      totalReceived: rows.length,
    });
  } catch (error: any) {
    console.error('Error during bulk import:', error);
    return NextResponse.json({ error: error.message || 'Failed to process universal bulk import' }, { status: 500 });
  }
}
