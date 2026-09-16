import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

/**
 * Adds a manually-found contact to a company Hunter/Apollo/Vibe Prospecting
 * couldn't find one for (e.g. blocked by an Apollo plan limit or exhausted
 * Explorium credits — a real account/billing limit, not something the
 * enrichment cascade can retry its way past) and generates the same fixed
 * partnership-outreach draft the automated pipeline would have made.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { contactName, contactRole, contactEmail } = body;

    if (!contactEmail || !contactName || !contactRole) {
      return NextResponse.json({ error: 'Contact name, role, and email are all required' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const cleanEmail = contactEmail.toLowerCase().trim();
    const existingContact = await prisma.contact.findFirst({ where: { email: cleanEmail } });
    if (existingContact) {
      return NextResponse.json({ error: `A contact with email ${cleanEmail} already exists` }, { status: 409 });
    }

    const contact = await prisma.contact.create({
      data: {
        companyId: company.id,
        fullName: contactName.trim(),
        firstName: contactName.trim().split(' ')[0],
        lastName: contactName.trim().split(' ').slice(1).join(' '),
        jobTitle: contactRole.trim(),
        department: 'Corporate Operations & Travel Management',
        seniorityLevel: 'MANAGER',
        email: cleanEmail,
        emailSource: 'MANUAL_ENTRY',
        emailConfidence: 1,
        verificationStatus: 'VERIFIED',
        isPrimaryContact: true,
      },
    });

    const draftContent = EmailGenerator.renderPartnershipTemplate({
      recipient: {
        name: contact.fullName,
        role: contact.jobTitle,
        companyName: company.name,
        email: contact.email,
      },
    });

    const draft = await prisma.emailDraft.create({
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
        htmlBody: draftContent.htmlBody,
        personalizationReasoning: draftContent.personalizationReasoning,
        aiEvidenceCited: JSON.stringify(draftContent.evidenceCited || []),
        status: 'READY_FOR_REVIEW',
      },
    });

    await logActivity({
      action: 'CONTACT_FOUND',
      entityType: 'COMPANY',
      entityId: company.id,
      actor: 'ADMIN_USER',
      description: `Contact ${contact.fullName} (${contact.email}) added manually to ${company.name} and outreach draft generated.`,
    });

    await createNotification({
      type: 'DRAFT_READY',
      title: `Draft Ready: ${company.name}`,
      message: `Outreach draft generated for ${contact.fullName} at ${company.name}.`,
      linkUrl: '/review',
    });

    return NextResponse.json({ success: true, contact, draft }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding manual company contact:', error);
    return NextResponse.json({ error: error.message || 'Failed to add contact' }, { status: 500 });
  }
}
