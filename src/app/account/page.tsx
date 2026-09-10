import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) redirect("/auth");

  const { data: profile } = await supabase.from("profiles").select("id, display_name, primary_role, locale").eq("id", userId).maybeSingle();
  const { data: provider } = profile?.primary_role === "provider"
    ? await supabase.from("provider_profiles").select("business_name, status, is_verified, is_discoverable").eq("user_id", userId).maybeSingle()
    : { data: null };

  return (
    <main className="shell" style={{ minHeight: "100vh", paddingBlock: 44 }}>
      <BrandMark />
      <section style={{ maxWidth: 760, marginTop: 55 }}>
        <p className="eyebrow">YOUR CAKELIO</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 54, letterSpacing: -2.5, margin: "12px 0" }}>Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}.</h1>
        <p style={{ color: "#75675F", lineHeight: 1.65 }}>Your authenticated Cakelio account is connected to the new shared backend. Saved designs, requests, messages and orders will appear here as those workflows are connected.</p>

        <div style={{ display: "grid", gap: 12, marginTop: 28 }}>
          <div style={{ background: "#FFFDF9", border: "1px solid #E6D9CF", borderRadius: 20, padding: 22 }}>
            <strong>Account type</strong><p style={{ color: "#75675F", marginBottom: 0 }}>{profile?.primary_role === "provider" ? "Cake maker / Provider" : "Customer"}</p>
          </div>
          {profile?.primary_role === "provider" && (
            <div style={{ background: "#352620", color: "#FFF8F2", borderRadius: 20, padding: 22 }}>
              <strong>Cakelio Pro</strong>
              <p style={{ color: "#D2C6BE" }}>{provider ? `${provider.business_name} · ${provider.status}${provider.is_verified ? " · verified" : ""}` : "Provider onboarding is the next step. Your business profile has not been created yet."}</p>
              {!provider && <Link className="button buttonCream" href="/for-bakers">Continue provider setup</Link>}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
          <Link className="button buttonPrimary" href="/studio">Open Cake Studio</Link>
          <Link className="button buttonSoft" href="/bakers">Find bakers</Link>
          <form action="/auth/signout" method="post"><button className="button buttonGhost" type="submit">Sign out</button></form>
        </div>
      </section>
    </main>
  );
}
