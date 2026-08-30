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
      // Split off suffix like __1, __2
      const baseKey = key.split('__')[0];
      const cleanKey = baseKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanAlias || (cleanKey.length > 3 && cleanAlias.length > 3 && (cleanKey.includes(cleanAlias) || cleanAlias.includes(cleanKey)))) {
        const val = item[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  return '';
}

/**
 * Fallback to find any valid email string in the row object
 */
function findAnyEmail(item: Record<string, any>): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  for (const key of Object.keys(item)) {
    const val = String(item[key] || '').trim();
    const match = val.match(emailRegex);
    if (match) {
      return match[0].toLowerCase();
    }
  }
  return '';
}

/**
 * Clean & Format Person Name from email if missing
 */
function formatNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) return 'Executive Travel Coordinator';
  const prefix = email.split('@')[0];
  const parts = prefix.split(/[._-]/).filter(p => p.length > 1 && isNaN(Number(p)));
  if (parts.length >= 2) {
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  } else if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  }
  return 'Executive Operations Lead';
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
      // 1. Extract Email with broad aliases + regex fallback
      let contactEmail = extractValue(item, [
        'email_address',
        'email',
        'work_email',
        'corporate_email',
        'contact_email',
        'direct_email',
        'primary_email',
        'contactEmail',
        'value',
      ]);

      if (!contactEmail || !contactEmail.includes('@')) {
        contactEmail = findAnyEmail(item);
      }

      // 2. Extract Company Name (Apollo, Hunter, Snov, Anymail Finder, LinkedIn, Generic)
      let companyName = extractValue(item, [
        'organization',
        'organization_name',
        'company_name',
        'company',
        'companyName',
        'account_name',
        'employer',
        'business_name',
      ]);

      // 3. Extract Website / Domain
      let website = extractValue(item, [
        'website',
        'domain',
        'domain_name',
        'company_website',
        'company_domain',
        'url',
        'web',
        'homepage',
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

      if (!companyName && !contactEmail) {
        skippedCount++;
        continue;
      }

      if (!companyName) {
        companyName = 'Corporate Partner';
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

      if (!contactFullName && contactEmail) {
        contactFullName = formatNameFromEmail(contactEmail);
      }

      if (!contactFullName) {
        contactFullName = 'Executive Travel Coordinator';
      }

      // 5. Extract Job Title / Role
      let contactRole = extractValue(item, [
        'job_title',
        'title',
        'position',
        'position_raw',
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
      const size = extractValue(item, ['headcount', 'size', 'company_size', 'employees', 'employee_count', 'number_of_employees']) || 'Medium (50-200)';
      const linkedinUrl = extractValue(item, ['linkedin_url', 'linkedin', 'person_linkedin_url', 'profile_url', 'person_linkedin']);

      // Check if contact already exists in database
      if (contactEmail) {
        const existingContact = await prisma.contact.findFirst({
          where: { email: { equals: contactEmail.toLowerCase().trim() } },
        });
        if (existingContact) {
          skippedCount++;
          continue;
        }
      }

      // Find or create Company
      let company = await prisma.company.findFirst({
        where: {
          OR: [
            { name: { equals: companyName } },
            { domain: { equals: domain } },
            { website: { contains: domain } },
          ],
        },
      });

      if (!company) {
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

        company = await prisma.company.create({
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
      }

      // Create Contact
      const finalContactEmail = contactEmail || `travel.desk@${domain}`;
      const contact = await prisma.contact.create({
        data: {
          companyId: company.id,
          fullName: contactFullName,
          firstName: contactFullName.split(' ')[0] || contactFullName,
          lastName: contactFullName.split(' ').slice(1).join(' ') || '',
          email: finalContactEmail.toLowerCase().trim(),
          jobTitle: contactRole,
          department: 'Corporate Operations & Travel Management',
          seniorityLevel: 'MANAGER',
          emailConfidence: 0.95,
          verificationStatus: 'VERIFIED',
          linkedinUrl: linkedinUrl || null,
          isPrimaryContact: true,
        },
      });

      // Generate Tailored 2-Layer Personalized Outreach Pitch
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
          name: contactFullName,
          role: contactRole,
          companyName,
          email: finalContactEmail,
        },
        context: {
          type: 'COMPANY',
          industry,
          location: `${city}, ${state}`,
          signals: [`${companyName} corporate presence in ${city}`, `Executive travel intensity in ${industry}`, `${contactRole} transport coordination`],
        },
      });

      // Create Email Draft in Review Queue
      await prisma.emailDraft.create({
        data: {
          companyId: company.id,
          contactId: contact.id,
          recipientName: contactFullName,
          recipientEmail: finalContactEmail.toLowerCase().trim(),
          recipientRole: contactRole,
          subject: generated.subject,
          fixedContent: generated.fixedContent,
          dynamicContent: generated.dynamicContent,
          fullBodyText: generated.fullBodyText,
          personalizationReasoning: generated.personalizationReasoning,
          aiEvidenceCited: JSON.stringify(generated.evidenceCited || []),
          status: 'READY_FOR_REVIEW',
        },
      });

      importedCount++;
    }

    if (importedCount > 0) {
      await logActivity({
        action: 'DISCOVERY',
        entityType: 'COMPANY',
        actor: 'ADMIN_USER',
        description: `Universal CSV Import complete: Successfully imported ${importedCount} contacts across companies with tailored AI drafts.`,
        details: { imported: importedCount, skipped: skippedCount },
      });

      await createNotification({
        type: 'DRAFT_READY',
        title: `Universal CSV Import Complete: ${importedCount} Drafts Ready`,
        message: `${importedCount} leads parsed and personalized drafts generated for Review Queue.`,
        linkUrl: '/review',
      });
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      message: `Universal Import complete! ${importedCount} contacts imported & personalized drafts created. ${skippedCount} duplicate/invalid rows skipped.`,
    });
  } catch (error: any) {
    console.error('Error in universal bulk import:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process universal CSV import' },
      { status: 500 }
    );
  }
}
