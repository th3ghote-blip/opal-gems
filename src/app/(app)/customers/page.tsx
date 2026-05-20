import { createClient } from "@/lib/supabase/server";
import { CustomersList } from "./list";

export const dynamic = "force-dynamic";

interface SearchParams { q?: string }

interface CustomerRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  sales: { id: string }[];
}

export default async function CustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  let query = supabase
    .from("customers")
    .select("id, full_name, phone, email, created_at, sales (id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (searchParams.q) {
    const term = searchParams.q.trim();
    query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const { data } = await query;
  const rows = (data ?? []) as unknown as CustomerRow[];
  const customers = rows.map((c) => ({
    id: c.id,
    full_name: c.full_name,
    phone: c.phone,
    email: c.email,
    created_at: c.created_at,
    sales_count: c.sales?.length ?? 0,
  }));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
      </header>
      <CustomersList initial={customers} q={searchParams.q ?? ""} />
    </div>
  );
}
