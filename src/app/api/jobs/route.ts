import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-logger';
import { processDueFollowUps } from '@/lib/jobs/follow-ups';
import { discoverCompaniesForActiveLocations } from '@/lib/jobs/company-discovery';
import { ZohoImapSyncEngine } from '@/lib/email/imap-sync';

export async function GET() {
  try {
    const jobs = await prisma.backgroundJob.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobType, action } = body; // action: 'TRIGGER' | 'TOGGLE'

    if (!jobType) {
      return NextResponse.json({ error: 'jobType is required' }, { status: 400 });
    }

    if (action === 'TOGGLE') {
      const job = await prisma.backgroundJob.findUnique({ where: { jobType } });
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

      const updated = await prisma.backgroundJob.update({
        where: { jobType },
        data: { isEnabled: !job.isEnabled },
      });
      return NextResponse.json({ success: true, job: updated });
    }

    // Action: TRIGGER — every job below does real work; nothing here is a
    // fabricated success message.
    const now = new Date();
    let resultSummary = '';
    let processed = 0;
    let jobStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';

    if (jobType === 'CORPORATE_DISCOVERY') {
      const result = await discoverCompaniesForActiveLocations();
      processed = result.companiesImported;
      resultSummary = `Scanned ${result.locationsScanned} active location(s) via Apollo/Google Places/OpenStreetMap. Found ${result.candidatesFound} new candidates, imported ${result.companiesImported} with ${result.contactsFound} contact(s) drafted.`;
      if (result.notes.length > 0) {
        resultSummary += ` Notes: ${result.notes.slice(0, 3).join(' | ')}`;
      }
    } else if (jobType === 'EVENT_DISCOVERY') {
      // Honest limitation: there is currently no live, general-purpose
      // "any event in Australia" data source connected (Eventbrite's public
      // search API has been discontinued since 2020, and no free
      // equivalent exists). Rather than fabricate a success message, say so.
      resultSummary =
        'No live event data source is currently connected — automatic Australia-wide event discovery is not yet configured. ' +
        'Add events manually via "Add Custom Event", or via the curated Location Event Radar. ' +
        'Ask your admin about connecting a real events data provider (e.g. PredictHQ) to automate this.';
      processed = 0;
    } else if (jobType === 'FOLLOW_UP_CHECK') {
      const result = await processDueFollowUps('ADMIN_USER');
      processed = result.sent;
      resultSummary = `Checked ${result.dueCount} due follow-up(s): ${result.sent} sent, ${result.cancelled} cancelled (prospect replied), ${result.failed} failed.`;
      if (result.notes.length > 0) {
        resultSummary += ` Notes: ${result.notes.slice(0, 3).join(' | ')}`;
      }
    } else if (jobType === 'INBOX_MONITOR') {
      const sync = await ZohoImapSyncEngine.syncInboundReplies();
      if (sync.success) {
        processed = sync.syncedCount;
        resultSummary = `Synced inbound mailbox: ${sync.syncedCount} new reply/replies classified.`;
      } else {
        jobStatus = 'FAILED';
        resultSummary = sync.error || 'Failed to sync inbound mailbox.';
      }
    } else {
      return NextResponse.json({ error: `Unknown jobType: ${jobType}` }, { status: 400 });
    }

    const updatedJob = await prisma.backgroundJob.update({
      where: { jobType },
      data: {
        lastRunAt: now,
        status: jobStatus,
        lastResultSummary: resultSummary,
        itemsProcessed: { increment: processed },
        errorsCount: jobStatus === 'FAILED' ? { increment: 1 } : undefined,
      },
    });

    await logActivity({
      action: 'JOB_RUN',
      entityType: 'SETTING',
      actor: 'ADMIN_USER',
      description: `Executed background job: ${updatedJob.title}.`,
      details: { summary: resultSummary, processed, status: jobStatus },
    });

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error: any) {
    console.error('Error running job:', error);
    return NextResponse.json({ error: error.message || 'Failed to run job' }, { status: 500 });
  }
}
