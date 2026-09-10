import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { AccountDashboard } from "@/components/AccountDashboard";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, primary_role, locale, phone, city, postal_code, country_code")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) redirect("/auth");

  const { data: provider } = profile.primary_role === "provider"
    ? await supabase
        .from("provider_profiles")
        .select("user_id, slug, business_name, bio, city, postal_code, country_code, website, instagram_handle, delivery_radius_km, minimum_lead_days, starting_price, currency, status, is_verified, is_discoverable, accepting_orders")
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null };

  return (
    <main>
      <Nav />
      <AccountDashboard userId={userId} initialProfile={profile} initialProvider={provider} />
    </main>
  );
}
