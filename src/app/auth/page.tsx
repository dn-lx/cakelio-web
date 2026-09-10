"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type AccountType = "customer" | "provider";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/account");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: displayName.trim(),
            account_type: accountType,
            locale: "de-DE",
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        router.replace("/account");
        router.refresh();
      } else {
        setMessage("Account created. Please check your email to confirm your address.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = { width: "100%", padding: "13px 14px", border: "1px solid #E6D9CF", borderRadius: 12, background: "#FFFDF9", font: "inherit", color: "#352620" } as const;

  return (
    <main className="shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", paddingBlock: 48 }}>
      <section style={{ width: "min(100%, 520px)", background: "#FFFDF9", border: "1px solid #E6D9CF", borderRadius: 28, padding: 30, boxShadow: "0 28px 80px rgba(72,45,34,.10)" }}>
        <BrandMark />
        <p className="eyebrow" style={{ marginTop: 32 }}>{mode === "signin" ? "WELCOME BACK" : "JOIN CAKELIO"}</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 43, letterSpacing: -2, margin: "10px 0 8px" }}>{mode === "signin" ? "Sign in to Cakelio" : "Create your Cakelio account"}</h1>
        <p style={{ color: "#75675F", lineHeight: 1.6, marginTop: 0 }}>{mode === "signin" ? "Continue with your saved designs, requests and conversations." : "Start as a customer or create a provider account for your cake business."}</p>

        {mode === "signup" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "22px 0" }}>
            {(["customer", "provider"] as AccountType[]).map((type) => (
              <button key={type} type="button" onClick={() => setAccountType(type)} style={{ padding: 13, borderRadius: 12, border: `1px solid ${accountType === type ? "#5D735F" : "#E6D9CF"}`, background: accountType === type ? "#DFE7DD" : "#FFF8F2", color: "#352620", fontWeight: 750, cursor: "pointer" }}>
                {type === "customer" ? "Customer" : "Cake maker / Provider"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 22 }}>
          {mode === "signup" && <input style={inputStyle} required placeholder="Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />}
          <input style={inputStyle} required type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={inputStyle} required minLength={8} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="button buttonPrimary" style={{ width: "100%", padding: 14, marginTop: 4 }} disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>

        {message && <p style={{ background: "#FFF8F2", border: "1px solid #E6D9CF", borderRadius: 12, padding: 12, color: "#4B3A33", fontSize: 13 }}>{message}</p>}

        <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }} style={{ width: "100%", border: 0, background: "transparent", marginTop: 18, color: "#B65C42", fontWeight: 800, cursor: "pointer" }}>
          {mode === "signin" ? "New to Cakelio? Create an account" : "Already have an account? Sign in"}
        </button>
        <div style={{ textAlign: "center", marginTop: 18 }}><Link href="/" style={{ color: "#75675F", fontSize: 12 }}>Back to Cakelio</Link></div>
      </section>
    </main>
  );
}
