/**
 * WhatsApp Templates Seed API
 *
 * POST /api/whatsapp/templates/seed — Auto-seed default FYBER templates
 *
 * Seeds the 5 pre-configured FYBER journey templates into Firestore
 * if they don't already exist. This saves manual mapping work.
 */

import { NextResponse } from 'next/server';
import { getAllTemplates, createTemplate } from '@/src/services/firestore.service';

// ─── Default FYBER Templates ─────────────────────────────────────────────────

const DEFAULT_FYBER_TEMPLATES = [
  {
    templateName: 'fyber_welcome_delivered',
    campaignName: 'fyber_welcome_campaign',
    templateId: '',
    dayNumber: 0,
    messageContent: 'Welcome message — Your FYBER has arrived 🤍 with how-to-use instructions',
    variables: ['customer_name'],
    active: true,
  },
  {
    templateName: 'fyber_daily_reminder',
    campaignName: 'fyber_reminder_campaign',
    templateId: '',
    dayNumber: 1,
    messageContent: 'Tiny FYBER reminder ✨ — Did you take your FYBER today? Consistency tips & early benefits',
    variables: ['customer_name'],
    active: true,
  },
  {
    templateName: 'fyber_early_wins',
    campaignName: 'fyber_early_wins_campaign',
    templateId: '',
    dayNumber: 3,
    messageContent: 'Day 3 check-in — Early wins, habit building & body adjusting 🌟',
    variables: ['customer_name'],
    active: true,
  },
  {
    templateName: 'fyber_craving_tips',
    campaignName: 'fyber_craving_tips_campaign',
    templateId: '',
    dayNumber: 5,
    messageContent: 'Craving control tips — How FYBER helps you feel full naturally 🧠✨',
    variables: ['customer_name'],
    active: true,
  },
  {
    templateName: 'fyber_week_one',
    campaignName: 'fyber_week_one_campaign',
    templateId: '',
    dayNumber: 7,
    messageContent: '1 WEEK with FYBER 🎉 — Progress check, celebration & encouragement',
    variables: ['customer_name'],
    active: true,
  },
];

export async function POST() {
  try {
    // Check what templates already exist
    const existing = await getAllTemplates();
    const existingNames = new Set(existing.map((t) => t.templateName));

    let seeded = 0;
    let skipped = 0;

    for (const template of DEFAULT_FYBER_TEMPLATES) {
      if (existingNames.has(template.templateName)) {
        skipped++;
        continue;
      }

      await createTemplate(template);
      seeded++;
    }

    return NextResponse.json(
      {
        success: true,
        seeded,
        skipped,
        total: existing.length + seeded,
        message: seeded > 0
          ? `✅ Seeded ${seeded} FYBER templates`
          : '📌 All templates already exist',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error seeding templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to seed templates' },
      { status: 500 }
    );
  }
}
