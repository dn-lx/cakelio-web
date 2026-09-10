import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { OrderRequestForm } from "@/components/OrderRequestForm";
import { createClient } from "@/lib/supabase/server";

export default async function OrderPage({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect(`/auth?next=/order/${providerId}`);
  const { data: baker } = await supabase.from("provider_profiles").select("user_id,business_name,minimum_lead_days,starting_price,currency,city").eq("user_id",providerId).eq("status","active").eq("is_discoverable",true).eq("accepting_orders",true).maybeSingle();
  if (!baker) notFound();
  return <main><Nav/><OrderRequestForm baker={baker}/></main>;
}
