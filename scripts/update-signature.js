const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating database drafts to include recipient name under Warm regards...');

  const drafts = await prisma.emailDraft.findMany();
  for (const draft of drafts) {
    let recipientFirstName = (draft.recipientName || 'there').split(' ')[0];

    let body = draft.fullBodyText;

    // Standardize Warm regards section
    const targetSignatureRegex = /Warm regards,[\s\S]*$/i;
    const newSignatureBlock = `Warm regards,\n\n${recipientFirstName},\n\nCorporate Partnerships Team\nOpal Chauffeurs\nWeb: https://www.opalchauffeurs.com.au/\nEmail: book@opalchauffeurs.com.au | Direct: +61 432 000 718`;

    if (targetSignatureRegex.test(body)) {
      body = body.replace(targetSignatureRegex, newSignatureBlock);
    } else {
      body = body + `\n\n` + newSignatureBlock;
    }

    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        fullBodyText: body,
      },
    });
    console.log(`Updated draft for ${draft.recipientName} (${recipientFirstName})`);
  }

  console.log(`✅ Successfully updated ${drafts.length} drafts with recipient name under Warm regards.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
