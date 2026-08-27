import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CorporateIntelligenceEngine } from '@/lib/ai/corporate';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Valid rows array is required for bulk import' }, { status: 400 });
    }

    const profile = await prisma.businessProfile.findFirst();
    const bProfile = profile || {
      companyName: 'Opal Chauffeurs',
      tradingName: 'Esteem Travel Service Pty Ltd',
      website: 'https://www.opalchauffeurs.com.au/',
      description: 'Premium chauffeur transportation service based in Melbourne, Australia.',
      brandPositioning: 'Melbourne’s premier executive transport partner. Punctual, discreet, 24/7 reliability.',
      emailSignature: `Warm regards,\nCorporate Partnerships Team\nOpal Chauffeurs (Esteem Travel Service Pty Ltd)\nWeb: https://www.opalchauffeurs.com.au/`,
      collaborationOffer: 'Introducing Opal Chauffeurs as your corporate transport partner.',
    };

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of rows) {
      const companyName = item.companyName || item['Company Name'] || item['Company'] || item.name;
      const website = item.website || item['Website'] || item['Company Website'] || item.domain || '';
      const industry = item.industry || item['Industry'] || 'Corporate & Professional Services';
      const city = item.city || item['City'] || 'Melbourne';
      const state = item.state || item['State'] || 'VIC';
      const contactFullName = item.contactName || item['Full Name'] || item['Name'] || `${item['First Name'] || ''} ${item['Last Name'] || ''}`.trim() || 'Executive Travel Coordinator';
      const contactRole = item.contactRole || item['Title'] || item['Job Title'] || 'Head of Executive Operations & Corporate Travel';
      const contactEmail = item.contactEmail || item['Email'] || item['Work Email'] || item['Contact Email'] || '';

      if (!companyName) {
        skippedCount++;
        continue;
      }

      // Check duplicate
      const existing = await prisma.company.findFirst({
        where: {
          OR: [
            { name: { equals: companyName } },
            ...(website ? [{ website: { contains: website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] } }] : []),
          ],
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      const domain = website ? website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.au`;

      // Run Corporate Opportunity Scoring Engine
      const analysis = CorporateIntelligenceEngine.analyzeCompany({
        name: companyName,
        website: website || `https://${domain}`,
        industry,
        city,
        state,
        headquartersAddress: `${city}, ${state}`,
        approximateSize: item.size || item['Company Size'] || 'Medium (50-200)',
        officeCount: 2,
        internationalPresence: true,
      });

      // Create Company
      const company = await prisma.company.create({
        data: {
          name: companyName,
          website: website || `https://${domain}`,
          domain,
          industry,
          city,
          state,
          headquartersAddress: `${city}, ${state}`,
          approximateSize: item.size || item['Company Size'] || 'Medium (50-200)',
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
          emailSource: contactEmail ? 'APOLLO_CSV_IMPORT' : 'SYNTHESIZED_ROLE',
          emailConfidence: contactEmail ? 0.95 : 0.8,
          verificationStatus: contactEmail ? 'VERIFIED' : 'LIKELY',
          linkedinUrl: item['LinkedIn Url'] || item.linkedin || '',
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
      description: `Bulk imported and scored ${importedCount} corporate organizations with AI outreach drafts generated.`,
      details: { importedCount, skippedCount },
    });

    if (importedCount > 0) {
      await createNotification({
        type: 'JOB_COMPLETED',
        title: `Bulk Import Complete: ${importedCount} Companies Added`,
        message: `${importedCount} companies and decision-makers were imported and queued in the Review Queue.`,
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
    return NextResponse.json({ error: error.message || 'Failed to process bulk import' }, { status: 500 });
  }
}
