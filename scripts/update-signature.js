const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating Business Profile and Email Drafts signature...');

  const newSignature = `Warm regards,\n\nCorporate Partnerships Team\nOpal Chauffeurs\nWeb: https://www.opalchauffeurs.com.au/\nEmail: book@opalchauffeurs.com.au | Direct: +61 432 000 718`;

  // 1. Update BusinessProfile
  const profile = await prisma.businessProfile.findFirst();
  if (profile) {
    await prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        companyName: 'Opal Chauffeurs',
        tradingName: 'Opal Chauffeurs',
        phone: '+61 432 000 718',
        email: 'book@opalchauffeurs.com.au',
        address: '',
        suburb: 'Melbourne',
        emailSignature: newSignature,
      },
    });
    console.log('✅ Business Profile updated.');
  }

  // 2. Update all EmailDrafts fullBodyText and fixedContent
  const drafts = await prisma.emailDraft.findMany();
  for (const draft of drafts) {
    let body = draft.fullBodyText;

    // Clean out Esteem Travel Service and old location & emails
    body = body.replace(/Opal Chauffeurs \(Esteem Travel Service Pty Ltd\)/g, 'Opal Chauffeurs');
    body = body.replace(/Esteem Travel Service Pty Ltd/g, 'Opal Chauffeurs');
    body = body.replace(/18 Crawford Road, Clarinda VIC 3169\n?/g, '');
    body = body.replace(/bookings@opalchauffeurs\.com\.au/g, 'book@opalchauffeurs.com.au');
    body = body.replace(/\+61 400 000 000/g, '+61 432 000 718');

    // Clean fixed content
    let fixed = draft.fixedContent;
    fixed = fixed.replace(/ \(Esteem Travel Service Pty Ltd\)/g, '');
    fixed = fixed.replace(/Esteem Travel Service Pty Ltd/g, 'Opal Chauffeurs');

    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        fullBodyText: body,
        fixedContent: fixed,
      },
    });
  }

  console.log(`✅ Updated ${drafts.length} existing email drafts in the database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
