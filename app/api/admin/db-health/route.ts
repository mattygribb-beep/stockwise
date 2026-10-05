import { NextResponse } from 'next/server'
import { getSql } from '../../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sql = getSql()
    const [db, suppliers, offers, amazon, masters] = await Promise.all([
      sql`SELECT current_database() AS database, current_user AS user, now() AS checked_at`,
      sql`SELECT count(*)::int AS count FROM suppliers`,
      sql`SELECT count(*)::int AS count FROM supplier_offers WHERE is_active=true`,
      sql`SELECT count(*)::int AS count FROM amazon_catalogue_candidates WHERE match_status<>'hidden'`,
      sql`SELECT count(*)::int AS count FROM master_product_identities`,
    ])

    return NextResponse.json({
      ok: true,
      database: db[0]?.database ?? null,
      checkedAt: db[0]?.checked_at ?? null,
      counts: {
        suppliers: suppliers[0]?.count ?? 0,
        activeSupplierOffers: offers[0]?.count ?? 0,
        amazonCandidates: amazon[0]?.count ?? 0,
        masterProductIdentities: masters[0]?.count ?? 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Database health check failed' },
      { status: 500 },
    )
  }
}
