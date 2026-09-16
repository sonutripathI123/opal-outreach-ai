import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailGenerator } from '@/lib/ai/email-generator';
import { logActivity, createNotification } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

interface ContactInput {
  contactName: string;
  contactRole: string;
  contactEmail: string;
}

/**
 * Adds one or more manually-found contacts to a company Hunter/Apollo/Vibe
 * Prospecting couldn't find any for (e.g. blocked by an Apollo plan limit
 * or exhausted Explorium credits — a real account/billing limit, not
 * something the enrichment cascade can retry its way past) and generates
 * the same fixed partnership-outreach draft the automated pipeline would
 * have made, for each one.
 *
 * Accepts either a single { contactName, contactRole, contactEmail } or a
 * batch { contacts: [{ contactName, contactRole, contactEmail }, ...] } —
 * each contact is processed independently, so one bad/duplicate email in a
 * batch of five doesn't block the other four.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const inputs: ContactInput[] = Array.isArray(body.contacts)
      ? body.contacts
      : [{ contactName: body.contactName, contactRole: body.contactRole, contactEmail: body.contactEmail }];

    if (inputs.length === 0) {
      return NextResponse.json({ error: 'At least one contact is required' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const created: { contact: any; draft: any }[] = [];
    const failed: { input: ContactInput; error: string }[] = [];

    for (const input of inputs) {
      const { contactName, contactRole, contactEmail } = input;
      if (!contactEmail?.trim() || !contactName?.trim() || !contactRole?.trim()) {
        failed.push({ input, error: 'Name, post/role, and email are all required' });
        continue;
      }

      const cleanEmail = contactEmail.toLowerCase().trim();
      const existingContact = await prisma.contact.findFirst({ where: { email: cleanEmail } });
      if (existingContact) {
        failed.push({ input, error: `A contact with email ${cleanEmail} already exists` });
        continue;
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

      created.push({ contact, draft });
    }

    if (created.length > 0) {
      await logActivity({
        action: 'CONTACT_FOUND',
        entityType: 'COMPANY',
        entityId: company.id,
        actor: 'ADMIN_USER',
        description: `${created.length} contact(s) added manually to ${company.name} and outreach draft(s) generated: ${created
          .map((c) => c.contact.fullName)
          .join(', ')}.`,
      });

      await createNotification({
        type: 'DRAFT_READY',
        title: `${created.length} Draft(s) Ready: ${company.name}`,
        message: `Outreach draft(s) generated for ${created.map((c) => c.contact.fullName).join(', ')} at ${company.name}.`,
        linkUrl: '/review',
      });
    }

    return NextResponse.json(
      {
        success: created.length > 0,
        // Backward-compatible single-contact shape when only one was sent.
        contact: created[0]?.contact,
        draft: created[0]?.draft,
        created,
        failed,
      },
      { status: created.length > 0 ? 201 : 400 }
    );
  } catch (error: any) {
    console.error('Error adding manual company contact(s):', error);
    return NextResponse.json({ error: error.message || 'Failed to add contact(s)' }, { status: 500 });
  }
}
