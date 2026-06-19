import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/vms-db";

export async function GET(request: NextRequest) {
  try {
    const commodityCode = request.nextUrl.searchParams.get("commodity_code");
    const vendorName = request.nextUrl.searchParams.get("name");

    let sql = `
      SELECT
        v.id,
        v.vendor_code,
        v.company_name,
        v.business_vertical,
        v.commodity_code,
        v.contact_person_name,
        v.email,
        v.phone_number
      FROM "Vendor" v
    `;
    const params: (string | number | boolean | null)[] = [];
    const conditions: string[] = [];

    conditions.push(`v.vendor_code IS NOT NULL`);

    if (commodityCode) {
      conditions.push(`v.commodity_code = $${params.length + 1}`);
      params.push(commodityCode);
    }
    if (vendorName) {
      conditions.push(`v.company_name ILIKE $${params.length + 1}`);
      params.push(`%${vendorName}%`);
    }

    sql += ` WHERE ${conditions.join(" AND ")}`;
    sql += ` ORDER BY v.company_name`;

    const vendors = await query(sql, params);

    return NextResponse.json(vendors);
  } catch (error) {
    console.error("Failed to fetch vendors:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}