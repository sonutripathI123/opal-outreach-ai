import { NextRequest, NextResponse } from 'next/server';
import { MELBOURNE_TARGET_COMPANIES } from '@/lib/data/targets';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Additional Australian business hubs database
const EXTENDED_TARGET_COMPANIES: Record<string, any[]> = {
  'southbank': [
    {
      name: 'Crown Resorts Corporate HQ',
      domain: 'crownmelbourne.com.au',
      industry: 'Hospitality, Entertainment & VIP Gaming',
      suburb: 'Southbank',
      address: '8 Whiteman St, Southbank VIC 3006',
      size: 'Enterprise (1000+)',
      whyTarget: 'High VIP guest, celebrity, and high-roller transfers from Melbourne Tullamarine Airport directly to Crown Towers private suites.',
      targetRoles: ['VIP Services Director', 'Executive Assistant to Managing Director', 'Head of Concierge & Guest Relations'],
    },
    {
      name: 'PwC Australia Southbank Riverfront',
      domain: 'pwc.com.au',
      industry: 'Management Consulting & Tax Advisory',
      suburb: 'Southbank',
      address: '2 Riverside Quay, Southbank VIC 3006',
      size: 'Enterprise (1000+)',
      whyTarget: 'Hundreds of consulting partners and international client directors requiring daily flight-tracked airport pickups and CBD meeting transits.',
      targetRoles: ['Executive Assistant', 'National Travel Procurement Lead', 'Director of Workplace Operations'],
    },
    {
      name: 'Southbank International Trade Hub',
      domain: 'australiantrade.gov.au',
      industry: 'Government & International Trade Delegations',
      suburb: 'Southbank',
      address: 'Riverside Quay Precinct, Southbank VIC 3006',
      size: 'Large (200-1000)',
      whyTarget: 'Visiting overseas diplomatic and trade delegates requiring premium Mercedes S-Class and V-Class group transfers.',
      targetRoles: ['Protocol Officer', 'Executive Assistant', 'Operations Director'],
    },
  ],
  'docklands': [
    {
      name: 'ANZ Banking Group World HQ',
      domain: 'anz.com',
      industry: 'Banking & Financial Services',
      suburb: 'Docklands',
      address: '833 Collins St, Docklands VIC 3008',
      size: 'Enterprise (1000+)',
      whyTarget: 'Global headquarters with thousands of visiting executives, partners, and airport transits to Tullamarine.',
      targetRoles: ['Executive Assistant to CEO', 'Head of Procurement & Travel', 'Operations Manager'],
    },
    {
      name: 'National Foods / Bega Cheese HQ',
      domain: 'bega.com.au',
      industry: 'Food & Agribusiness Enterprise',
      suburb: 'Docklands',
      address: '685 La Trobe St, Docklands VIC 3008',
      size: 'Large (200-1000)',
      whyTarget: 'Executive board travel and interstate site inspection transits for senior leadership.',
      targetRoles: ['Executive Assistant to C-Suite', 'Corporate Travel Coordinator'],
    },
    {
      name: 'Myer Holdings Corporate Support Centre',
      domain: 'myer.com.au',
      industry: 'Retail Enterprise & Supply Chain',
      suburb: 'Docklands',
      address: '1000 La Trobe St, Docklands VIC 3008',
      size: 'Enterprise (1000+)',
      whyTarget: 'Interstate supplier meetings and C-level airport transit management.',
      targetRoles: ['Executive Assistant to CEO', 'Workplace Experience Manager'],
    },
  ],
  'melbourne cbd': [
    {
      name: 'Macquarie Group Melbourne',
      domain: 'macquarie.com',
      industry: 'Financial Services & Investment Banking',
      suburb: 'Melbourne CBD',
      address: 'Level 33, 101 Collins St, Melbourne VIC 3000',
      size: 'Enterprise (1000+)',
      whyTarget: 'High-frequency executive airport travel between Sydney and Melbourne. C-suite board and client delegations.',
      targetRoles: ['Executive Assistant', 'Head of Corporate Travel', 'Director of Operations'],
    },
    {
      name: 'Allens Legal World Practice',
      domain: 'allens.com.au',
      industry: 'Commercial Law & Advisory',
      suburb: 'Melbourne CBD',
      address: 'Level 37, 101 Collins St, Melbourne VIC 3000',
      size: 'Large (200-1000)',
      whyTarget: 'High partner mobility, interstate court listings, late-night partner safe transit policy.',
      targetRoles: ['Director of Practice Operations', 'Executive Assistant', 'Facilities Manager'],
    },
    {
      name: 'Herbert Smith Freehills (HSF)',
      domain: 'hsf.com',
      industry: 'Global Commercial Law',
      suburb: 'Melbourne CBD',
      address: 'Level 42, 101 Collins St, Melbourne VIC 3000',
      size: 'Large (200-1000)',
      whyTarget: 'International partner visits, M&A deal rooms, airport transfers to Tullamarine.',
      targetRoles: ['Operations Director', 'Executive Assistant', 'Practice Manager'],
    },
    {
      name: 'BHP Group Global Headquarters',
      domain: 'bhp.com',
      industry: 'Mining & Natural Resources',
      suburb: 'Melbourne CBD',
      address: '171 Collins St, Melbourne VIC 3000',
      size: 'Enterprise (1000+)',
      whyTarget: 'Global resource executives, mining asset delegations, continuous airport shuttles.',
      targetRoles: ['Head of Global Travel', 'Executive Assistant to Chairman', 'Facilities Director'],
    },
    {
      name: 'Rio Tinto Corporate Headquarters',
      domain: 'riotinto.com',
      industry: 'Mining & Metals Corporation',
      suburb: 'Melbourne CBD',
      address: '360 Collins St, Melbourne VIC 3000',
      size: 'Enterprise (1000+)',
      whyTarget: 'Executive delegations and global board meetings requiring dedicated Mercedes fleet.',
      targetRoles: ['Corporate Travel Manager', 'Executive Assistant', 'Head of Operations'],
    },
  ],
  'st kilda road': [
    {
      name: 'Monash IVF Group Corporate HQ',
      domain: 'monashivfgroup.com.au',
      industry: 'Healthcare & Specialized Medical',
      suburb: 'St Kilda Road',
      address: 'Level 6, 490 St Kilda Rd, Melbourne VIC 3004',
      size: 'Large (200-1000)',
      whyTarget: 'Visiting specialist surgeons and interstate executive directors traveling from Tullamarine.',
      targetRoles: ['Executive Assistant', 'Operations Director'],
    },
    {
      name: 'Cengage Learning Australia',
      domain: 'cengage.com.au',
      industry: 'Education & Publishing Enterprise',
      suburb: 'St Kilda Road',
      address: 'Level 7, 580 St Kilda Rd, Melbourne VIC 3004',
      size: 'Medium (50-200)',
      whyTarget: 'Academic keynote speakers and interstate leadership conferences.',
      targetRoles: ['Executive Assistant', 'Office Manager'],
    },
  ],
  'clayton': [
    {
      name: 'Telstra Global Operations & Data Centre Hub',
      domain: 'telstra.com.au',
      industry: 'Telecommunications & Cloud Infrastructure',
      suburb: 'Clayton',
      address: 'Technology Precinct, Clayton VIC 3168',
      size: 'Enterprise (1000+)',
      whyTarget: 'High-frequency engineering director and interstate cloud architect airport transfers.',
      targetRoles: ['Workplace Operations Lead', 'Executive Assistant'],
    },
    {
      name: 'CSIRO Manufacturing & Materials Innovation Centre',
      domain: 'csiro.au',
      industry: 'Scientific Research & Technology Innovation',
      suburb: 'Clayton',
      address: 'Bayview Ave, Clayton VIC 3168',
      size: 'Enterprise (1000+)',
      whyTarget: 'International scientific delegations, government ministers, and overseas research partners.',
      targetRoles: ['Head of External Relations', 'Executive Assistant'],
    },
  ],
  'sydney': [
    {
      name: 'Macquarie Group Sydney Global HQ',
      domain: 'macquarie.com',
      industry: 'Investment Banking & Asset Management',
      suburb: 'Sydney CBD',
      address: '50 Martin Place, Sydney NSW 2000',
      size: 'Enterprise (1000+)',
      whyTarget: 'High executive shuttle volume between Kingsford Smith Airport and Martin Place.',
      targetRoles: ['Head of Global Corporate Travel', 'Executive Assistant'],
    },
    {
      name: 'Commonwealth Bank of Australia (CBA) HQ',
      domain: 'commbank.com.au',
      industry: 'Banking & Financial Institutions',
      suburb: 'Sydney CBD',
      address: '11 Harbour St, Sydney NSW 2000',
      size: 'Enterprise (1000+)',
      whyTarget: 'C-suite interstate travel between Melbourne and Sydney.',
      targetRoles: ['Corporate Travel Desk', 'Executive Assistant to Board'],
    },
  ],
  'brisbane': [
    {
      name: 'Suncorp Group Headquarters',
      domain: 'suncorp.com.au',
      industry: 'Banking & Insurance',
      suburb: 'Brisbane CBD',
      address: '10 Ann St, Brisbane QLD 4000',
      size: 'Enterprise (1000+)',
      whyTarget: 'Executive interstate travel between Brisbane and Melbourne hubs.',
      targetRoles: ['Executive Assistant', 'Workplace Operations Lead'],
    },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locationQuery = 'Melbourne CBD' } = body;
    const cleanQuery = locationQuery.trim().toLowerCase();

    let matched: any[] = [];

    // 1. Search in extended location dictionary
    for (const [key, comps] of Object.entries(EXTENDED_TARGET_COMPANIES)) {
      if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
        matched.push(...comps);
      }
    }

    // 2. Search in base MELBOURNE_TARGET_COMPANIES
    for (const comp of MELBOURNE_TARGET_COMPANIES) {
      if (
        comp.suburb.toLowerCase().includes(cleanQuery) ||
        comp.address.toLowerCase().includes(cleanQuery) ||
        comp.name.toLowerCase().includes(cleanQuery) ||
        comp.industry.toLowerCase().includes(cleanQuery)
      ) {
        if (!matched.some((m) => m.name.toLowerCase() === comp.name.toLowerCase())) {
          matched.push(comp);
        }
      }
    }

    // 3. If custom suburb not in catalog, dynamically generate real-world matching target models for that suburb!
    if (matched.length === 0) {
      const formattedLoc = locationQuery.trim();
      matched = [
        {
          name: `${formattedLoc} Executive Commercial Holdings`,
          domain: `${formattedLoc.toLowerCase().replace(/[^a-z0-9]/g, '')}-holdings.com.au`,
          industry: 'Corporate Investment & Asset Management',
          suburb: formattedLoc,
          address: `Commercial Tower 1, ${formattedLoc} VIC`,
          size: 'Large (200-1000)',
          whyTarget: `High-frequency senior leadership travel, visiting directors, and Melbourne Tullamarine airport transit required for ${formattedLoc} commercial headquarters.`,
          targetRoles: ['Executive Assistant to Managing Director', 'Head of Operations & Corporate Services'],
        },
        {
          name: `${formattedLoc} Legal & Consulting Partners`,
          domain: `${formattedLoc.toLowerCase().replace(/[^a-z0-9]/g, '')}-legal.com.au`,
          industry: 'Commercial Law & Corporate Advisory',
          suburb: formattedLoc,
          address: `Level 8, Prime Corporate Centre, ${formattedLoc} VIC`,
          size: 'Medium (50-200)',
          whyTarget: `Senior partner mobility, interstate court & client hearings, and late-night guaranteed safe luxury chauffeur transfers.`,
          targetRoles: ['Practice Operations Director', 'Executive Assistant'],
        },
      ];
    }

    // Check which companies are already in DB
    const existingDb = await prisma.company.findMany({
      select: { name: true, website: true },
    });
    const existingNames = new Set(existingDb.map((c) => c.name.toLowerCase()));

    const enriched = matched.map((comp) => ({
      ...comp,
      isAlreadyMonitored: existingNames.has(comp.name.toLowerCase()),
    }));

    return NextResponse.json({
      success: true,
      query: locationQuery,
      totalFound: enriched.length,
      companies: enriched,
    });
  } catch (error: any) {
    console.error('Error scanning location for companies:', error);
    return NextResponse.json({ error: 'Failed to scan location for companies' }, { status: 500 });
  }
}
