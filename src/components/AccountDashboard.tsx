"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "@/app/account/account.module.css";

type Profile = {
  id: string; display_name: string | null; primary_role: string; locale: string;
  phone: string | null; city: string | null; postal_code: string | null; country_code: string | null;
};
type Provider = {
  user_id: string; slug: string | null; business_name: string; bio: string | null; city: string | null;
  postal_code: string | null; country_code: string; website: string | null; instagram_handle: string | null;
  delivery_radius_km: number | null; minimum_lead_days: number; starting_price: number | null; currency: string;
  status: string; is_verified: boolean; is_discoverable: boolean; accepting_orders: boolean;
} | null;
type Row = Record<string, any>;
type Section = "profile" | "orders" | "messages" | "availability";

const money = (value: number | string | null | undefined, currency = "EUR") => new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(Number(value || 0));

export function AccountDashboard({ userId, initialProfile, initialProvider }: { userId: string; initialProfile: Profile; initialProvider: Provider }) {
  const supabase = useMemo(() => createClient(), []);
  const [section, setSection] = useState<Section>("profile");
  const [profile, setProfile] = useState(initialProfile);
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [requests, setRequests] = useState<Row[]>([]);
  const [quotes, setQuotes] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [conversations, setConversations] = useState<Row[]>([]);
  const [availability, setAvailability] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const isProvider = profile.primary_role === "provider";

  const loadData = useCallback(async () => {
    if (isProvider) {
      const [{ data: req }, { data: quo }, { data: ord }, { data: conv }, { data: avail }] = await Promise.all([
        supabase.from("request_provider_matches").select("id, request_id, status, created_at, cake_requests(id,event_date,fulfillment_type,delivery_city,delivery_postal_code,budget_min,budget_max,currency,notes,status,customer_id)").eq("provider_id", userId).order("created_at", { ascending: false }),
        supabase.from("quotes").select("*").eq("provider_id", userId).order("created_at", { ascending: false }),
        supabase.from("orders").select("*").eq("provider_id", userId).order("created_at", { ascending: false }),
        supabase.from("conversations").select("*").eq("provider_id", userId).order("created_at", { ascending: false }),
        supabase.from("provider_availability").select("*").eq("provider_id", userId),
      ]);
      setRequests(req || []); setQuotes(quo || []); setOrders(ord || []); setConversations(conv || []); setAvailability(avail || []);
    } else {
      const [{ data: req }, { data: quo }, { data: ord }, { data: conv }] = await Promise.all([
        supabase.from("cake_requests").select("*").eq("customer_id", userId).order("created_at", { ascending: false }),
        supabase.from("quotes").select("*").eq("customer_id", userId).order("created_at", { ascending: false }),
        supabase.from("orders").select("*").eq("customer_id", userId).order("created_at", { ascending: false }),
        supabase.from("conversations").select("*").eq("customer_id", userId).order("created_at", { ascending: false }),
      ]);
      setRequests(req || []); setQuotes(quo || []); setOrders(ord || []); setConversations(conv || []);
    }
  }, [isProvider, supabase, userId]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage("Saving…");
    const form = new FormData(e.currentTarget);
    const payload = {
      display_name: String(form.get("display_name") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      city: String(form.get("city") || "").trim() || null,
      postal_code: String(form.get("postal_code") || "").trim() || null,
      country_code: String(form.get("country_code") || "DE").trim().toUpperCase().slice(0,2),
      locale: String(form.get("locale") || "de-DE"),
    };
    const { data, error } = await supabase.from("profiles").update(payload).eq("id", userId).select().single();
    if (error) return setMessage(error.message);
    setProfile(data as Profile); setMessage("Profile saved.");
  }

  async function saveProvider(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage("Saving bakery profile…");
    const form = new FormData(e.currentTarget);
    const businessName = String(form.get("business_name") || "").trim();
    if (!businessName) return setMessage("Business name is required.");
    const rawSlug = String(form.get("slug") || businessName).trim().toLowerCase();
    const slug = rawSlug.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0,60);
    const published = form.get("published") === "on";
    const payload = {
      user_id: userId, business_name: businessName, slug,
      bio: String(form.get("bio") || "").trim() || null,
      city: String(form.get("provider_city") || "").trim() || null,
      postal_code: String(form.get("provider_postal_code") || "").trim() || null,
      country_code: String(form.get("provider_country_code") || "DE").trim().toUpperCase().slice(0,2),
      website: String(form.get("website") || "").trim() || null,
      instagram_handle: String(form.get("instagram_handle") || "").trim() || null,
      delivery_radius_km: Number(form.get("delivery_radius_km") || 0),
      minimum_lead_days: Number(form.get("minimum_lead_days") || 3),
      starting_price: Number(form.get("starting_price") || 0) || null,
      currency: "EUR",
      status: published ? "active" : "draft",
      is_discoverable: published,
      accepting_orders: form.get("accepting_orders") === "on",
    };
    const { data, error } = await supabase.from("provider_profiles").upsert(payload).select().single();
    if (error) return setMessage(error.message);
    setProvider(data as Provider); setMessage(published ? "Bakery profile published." : "Bakery profile saved as draft.");
  }

  async function setDayStatus(date: string, status: "available" | "unavailable" | "booked") {
    const { error } = await supabase.from("provider_availability").upsert({ provider_id: userId, available_date: date, status }, { onConflict: "provider_id,available_date" });
    if (error) return setMessage(error.message);
    setAvailability((old) => [...old.filter((x) => x.available_date !== date), { provider_id: userId, available_date: date, status }]);
  }

  async function acceptQuote(quoteId: string) {
    setMessage("Accepting quote…");
    const { error } = await supabase.rpc("accept_quote", { p_quote_id: quoteId });
    if (error) return setMessage(error.message);
    setMessage("Quote accepted. Your order is confirmed."); await loadData();
  }

  async function payOrder(orderId: string) {
    setMessage("Opening secure checkout…");
    const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
    const data = await response.json();
    if (!response.ok || !data.url) return setMessage(data.error || "Stripe Checkout is not configured yet.");
    window.location.assign(data.url);
  }

  const days = buildCalendar(month);
  const dayStatus = new Map(availability.map((x) => [x.available_date, x.status]));

  return <section className={styles.page}><div className={styles.wrap}>
    <div className={styles.head}><div><span className="eyebrow">YOUR CAKELIO</span><h1>Welcome{profile.display_name ? `, ${profile.display_name}` : ""}.</h1><p>Manage your profile, cake requests, conversations and orders from one place.</p></div><span className={styles.role}>{isProvider ? "Cakelio Pro · Baker" : "Customer"}</span></div>
    <div className={styles.tabs}>
      {(["profile","orders","messages"] as Section[]).map(x => <button key={x} className={`${styles.tab} ${section===x?styles.tabActive:""}`} onClick={()=>setSection(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}
      {isProvider && <button className={`${styles.tab} ${section==="availability"?styles.tabActive:""}`} onClick={()=>setSection("availability")}>Availability</button>}
    </div>
    {message && <div className={styles.notice}>{message}</div>}

    {section === "profile" && <div className={styles.grid}>
      <form className={styles.card} onSubmit={saveProfile}><h2>Personal profile</h2><p className={styles.muted}>This information belongs to your Cakelio account.</p><div className={styles.formGrid}>
        <label className={styles.field}><span>Name</span><input name="display_name" defaultValue={profile.display_name || ""}/></label>
        <label className={styles.field}><span>Phone</span><input name="phone" defaultValue={profile.phone || ""}/></label>
        <label className={styles.field}><span>City</span><input name="city" defaultValue={profile.city || ""}/></label>
        <label className={styles.field}><span>Postal code</span><input name="postal_code" defaultValue={profile.postal_code || ""}/></label>
        <label className={styles.field}><span>Country</span><input name="country_code" defaultValue={profile.country_code || "DE"}/></label>
        <label className={styles.field}><span>Language</span><select name="locale" defaultValue={profile.locale}><option value="de-DE">Deutsch</option><option value="en-GB">English</option></select></label>
      </div><div className={styles.actions}><button className={styles.primary}>Save profile</button></div></form>

      <div className={styles.card}><h2>Quick actions</h2><div className={styles.stack}><Link className={styles.link} href="/studio">🎂 Design a cake</Link><Link className={styles.link} href="/bakers">🔎 Find bakers</Link><Link className={styles.link} href="/messages">💬 Open messages</Link></div><form action="/auth/signout" method="post" className={styles.actions}><button className={styles.secondary}>Sign out</button></form></div>

      {isProvider && <form className={`${styles.card} ${styles.full}`} onSubmit={saveProvider}><h2>Bakery profile</h2><p className={styles.muted}>Create the public profile customers use to discover and order from you.</p><div className={styles.formGrid}>
        <label className={styles.field}><span>Business name</span><input name="business_name" defaultValue={provider?.business_name || ""} required/></label>
        <label className={styles.field}><span>Public URL slug</span><input name="slug" defaultValue={provider?.slug || ""} placeholder="marias-cakes"/></label>
        <label className={`${styles.field} ${styles.full}`}><span>About your bakery</span><textarea name="bio" defaultValue={provider?.bio || ""}/></label>
        <label className={styles.field}><span>City</span><input name="provider_city" defaultValue={provider?.city || ""}/></label>
        <label className={styles.field}><span>Postal code</span><input name="provider_postal_code" defaultValue={provider?.postal_code || ""}/></label>
        <label className={styles.field}><span>Country</span><input name="provider_country_code" defaultValue={provider?.country_code || "DE"}/></label>
        <label className={styles.field}><span>Delivery radius (km)</span><input type="number" min="0" max="500" name="delivery_radius_km" defaultValue={provider?.delivery_radius_km ?? 15}/></label>
        <label className={styles.field}><span>Minimum lead time (days)</span><input type="number" min="0" max="365" name="minimum_lead_days" defaultValue={provider?.minimum_lead_days ?? 3}/></label>
        <label className={styles.field}><span>Starting price (€)</span><input type="number" min="0" step="0.01" name="starting_price" defaultValue={provider?.starting_price ?? ""}/></label>
        <label className={styles.field}><span>Website</span><input name="website" defaultValue={provider?.website || ""}/></label>
        <label className={styles.field}><span>Instagram</span><input name="instagram_handle" defaultValue={provider?.instagram_handle || ""}/></label>
      </div><div className={styles.switchRow}><div><strong>Accepting orders</strong><div className={styles.muted}>Turn this off without deleting your bakery profile.</div></div><input className={styles.switch} type="checkbox" name="accepting_orders" defaultChecked={provider?.accepting_orders ?? true}/></div><div className={styles.switchRow}><div><strong>Publish in Cakelio Market</strong><div className={styles.muted}>Customers can discover your profile. Verification remains a separate Cakelio badge.</div></div><input className={styles.switch} type="checkbox" name="published" defaultChecked={provider?.status === "active" && provider?.is_discoverable}/></div><div className={styles.actions}><button className={styles.primary}>Save bakery profile</button>{provider?.is_verified && <span className={styles.status}>✓ Verified baker</span>}</div></form>}
    </div>}

    {section === "orders" && <div className={styles.grid}><div className={styles.card}><h2>{isProvider ? "Incoming cake requests" : "Your cake requests"}</h2><div className={styles.stack}>{requests.length===0?<div className={styles.empty}>{isProvider?"No requests yet.":"No cake requests yet. Start in Cakelio Studio."}</div>:requests.map((row)=>{const r=isProvider?(row.cake_requests||{}):row;const existing=quotes.find(q=>q.request_id===r.id&&q.provider_id===userId);return <div className={styles.item} key={row.id}><div className={styles.itemTop}><div><h3>{r.event_date?`Cake for ${r.event_date}`:"Cake request"}</h3><div className={styles.muted}>{r.fulfillment_type} · {r.delivery_city||"pickup"}<br/>{r.notes||"No extra notes"}</div></div><span className={styles.badge}>{r.status}</span></div>{isProvider && !existing && <QuoteComposer requestId={r.id} onDone={loadData}/>} {isProvider && existing && <div className={styles.notice}>Quote sent: {money(existing.total,existing.currency)}</div>}</div>})}</div></div>
      <div className={styles.card}><h2>{isProvider?"Confirmed orders":"Quotes & orders"}</h2><div className={styles.stack}>{!isProvider && quotes.filter(q=>q.status==="sent").map(q=><div className={styles.item} key={q.id}><div className={styles.itemTop}><div><h3>Quote received</h3><div className={styles.price}>{money(q.total,q.currency)}</div><div className={styles.muted}>{q.deposit_amount?`Deposit ${money(q.deposit_amount,q.currency)}`:"No deposit required"}</div></div><span className={styles.badge}>{q.status}</span></div><div className={styles.actions}><button className={styles.primary} onClick={()=>void acceptQuote(q.id)}>Accept quote</button></div></div>)}{orders.map(o=><div className={styles.item} key={o.id}><div className={styles.itemTop}><div><h3>Order {String(o.id).slice(0,8)}</h3><div className={styles.price}>{money(o.total,o.currency)}</div><div className={styles.muted}>Paid {money(o.amount_paid,o.currency)} · {o.payment_status||"unpaid"}</div></div><span className={styles.badge}>{o.status}</span></div>{!isProvider && o.payment_status!=="paid" && <div className={styles.actions}><button className={styles.primary} onClick={()=>void payOrder(o.id)}>Pay securely with Stripe</button></div>}</div>)}{orders.length===0 && (isProvider||quotes.filter(q=>q.status==="sent").length===0) && <div className={styles.empty}>Nothing here yet.</div>}</div></div></div>}

    {section === "messages" && <div className={styles.card}><h2>Conversations</h2><p className={styles.muted}>Every conversation stays attached to a cake request.</p><div className={styles.stack}>{conversations.length===0?<div className={styles.empty}>No conversations yet.</div>:conversations.map(c=><div className={styles.item} key={c.id}><div className={styles.itemTop}><div><h3>{isProvider?"Customer cake request":"Baker conversation"}</h3><div className={styles.muted}>Request {String(c.request_id).slice(0,8)}</div></div><Link className={styles.link} href={`/messages/${c.id}`}>Open chat →</Link></div></div>)}</div></div>}

    {section === "availability" && isProvider && <div className={styles.card}><h2>Availability calendar</h2><p className={styles.muted}>Click a day to cycle between available, unavailable and booked. Days without an override are treated as available.</p><div className={styles.calendarHead}><button className={styles.calendarNav} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>←</button><strong>{month.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</strong><button className={styles.calendarNav} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>→</button></div><div className={styles.calendar}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div className={styles.dow} key={d}>{d}</div>)}{days.map(d=>{const key=dateKey(d);const status=dayStatus.get(key)||"available";const outside=d.getMonth()!==month.getMonth();const next=status==="available"?"unavailable":status==="unavailable"?"booked":"available";return <button key={key} className={`${styles.day} ${styles[status]} ${outside?styles.outside:""}`} onClick={()=>void setDayStatus(key,next as "available"|"unavailable"|"booked")}><span>{d.getDate()}</span><small>{status}</small></button>})}</div></div>}
  </div></section>;
}

function QuoteComposer({ requestId, onDone }: { requestId: string; onDone: () => Promise<void> }) {
  const supabase = useMemo(() => createClient(), []);
  const [subtotal,setSubtotal]=useState(""); const [deposit,setDeposit]=useState(""); const [note,setNote]=useState(""); const [status,setStatus]=useState("");
  async function send(){setStatus("Sending…");const sub=Number(subtotal);if(!Number.isFinite(sub)||sub<0)return setStatus("Enter a valid price.");const {error}=await supabase.rpc("send_quote",{p_request_id:requestId,p_subtotal:sub,p_delivery_fee:0,p_discount:0,p_deposit_amount:deposit?Number(deposit):null,p_notes:note||null,p_expires_at:null});if(error)return setStatus(error.message);setStatus("Quote sent.");await onDone();}
  return <div><div className={styles.quoteBox}><input type="number" min="0" step="0.01" placeholder="Total before extras €" value={subtotal} onChange={e=>setSubtotal(e.target.value)}/><input type="number" min="0" step="0.01" placeholder="Deposit € (optional)" value={deposit} onChange={e=>setDeposit(e.target.value)}/><input style={{gridColumn:"1/-1"}} placeholder="Quote note" value={note} onChange={e=>setNote(e.target.value)}/></div><div className={styles.actions}><button className={styles.primary} type="button" onClick={()=>void send()}>Send quote</button>{status&&<span className={styles.status}>{status}</span>}</div></div>;
}

function dateKey(date: Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function buildCalendar(month: Date){const first=new Date(month.getFullYear(),month.getMonth(),1);const mondayOffset=(first.getDay()+6)%7;const start=new Date(first);start.setDate(first.getDate()-mondayOffset);return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});}
