// ============================================================
// GET /api/whatsapp/broadcasts/template-reports/[name]
//
// Returns comprehensive performance dossier for a single template:
//  - Template configuration & metadata
//  - Net deduplicated metrics (Unique targeted, net delivered, net read, net failed)
//  - Gross delivery attempts & volume
//  - All campaign runs & retries chain for this template
//  - Meta error code diagnostics (131026, 131049, 130429, 131047, etc.)
//  - Multi-tenant segment & tag performance breakdown
// ============================================================

import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getTemplateAudienceDossier } from '@/lib/broadcasts/template-audience-cache';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { accountId } = await requireRole('viewer');
    const { name } = await params;
    const templateName = decodeURIComponent(name);

    const dossier = await getTemplateAudienceDossier(accountId, templateName);

    return NextResponse.json({
      template: {
        name: templateName,
        category: dossier.templateMeta.category,
        language: dossier.templateMeta.language,
        status: dossier.templateMeta.status,
        body_text: dossier.templateMeta.body_text,
        footer_text: dossier.templateMeta.footer_text,
        buttons: dossier.templateMeta.buttons,
        header_type: dossier.templateMeta.header_type,
        header_content: dossier.templateMeta.header_content,
      },
      stats: dossier.stats,
      error_diagnostics: dossier.error_diagnostics,
      campaign_runs: dossier.broadcasts,
      tags: dossier.tags,
      is_store_tags: dossier.isStoreTags,
      store_breakdown: dossier.tag_breakdown,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
