export type VmsVendor = {
  id: number;
  vendor_code: string | null;
  company_name: string;
  business_vertical: string;
  commodity_code: string | null;
  status: string;
  contact_person_name: string | null;
  email: string | null;
  phone_number: string | null;
};

let cache: VmsVendor[] | null = null;
let pending: Promise<VmsVendor[]> | null = null;

export async function fetchVendors(commodityCode?: string): Promise<VmsVendor[]> {
  if (cache && !commodityCode) return cache;
  const url = commodityCode ? `/api/vendors?commodity_code=${encodeURIComponent(commodityCode)}` : "/api/vendors";
  if (!commodityCode && pending) return pending;
  if (!commodityCode) {
    pending = (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch vendors");
      cache = await res.json();
      return cache!;
    })();
    return pending;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch vendors");
  return res.json();
}

export function getCachedVendors(): VmsVendor[] {
  return cache ?? [];
}

export function clearVendorCache() {
  cache = null;
  pending = null;
}
