import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export default async function BakersPage() {
  const supabase = await createClient();
  const { data: bakers } = await supabase
    .from("provider_profiles")
    .select("user_id, slug, business_name, bio, city, postal_code, starting_price, currency, delivery_radius_km, minimum_lead_days, is_verified")
    .eq("status", "active")
    .eq("is_discoverable", true)
    .eq("accepting_orders", true)
    .order("created_at", { ascending: false });

  return <main><Nav /><section className="listingHero shell"><span className="eyebrow">CAKELIO MARKET</span><h1>Find a baker who fits your cake.</h1><p>Real baker profiles now come directly from Cakelio. Choose a maker, check their lead time and send a structured cake request.</p><div className="searchBar"><span>⌕</span><input aria-label="Search location" defaultValue="Frankfurt am Main" readOnly/><button type="button">Search</button></div></section><section className="listingArea shell"><div className="filterRow"><button type="button">Available date</button><button type="button">Cake style</button><button type="button">Dietary</button><button type="button">Price</button><span>{bakers?.length || 0} active bakers</span></div>{!bakers?.length?<div style={{padding:"54px 24px",textAlign:"center",border:"1px dashed #DCCDC3",borderRadius:22,color:"#75675F"}}><h2 style={{color:"#352620"}}>The first baker profiles are being prepared.</h2><p>Providers can now publish their profile from Cakelio Pro. Once active, they appear here automatically.</p><Link className="button buttonPrimary" href="/for-bakers">Create a baker profile</Link></div>:<div className="listingGrid">{bakers.map((baker,i)=>{const initials=String(baker.business_name).split(" ").map((part:string)=>part[0]).slice(0,2).join("").toUpperCase();return <article className="listingCard" key={baker.user_id}><div className={`listingPhoto bakerPhoto${(i%3)+1}`}><span>{initials}</span>{baker.is_verified&&<b style={{position:"absolute",left:14,top:14,background:"#FFFDF9",padding:"6px 9px",borderRadius:999,fontSize:10}}>✓ Verified</b>}</div><div className="listingBody"><div className="listingTitle"><div><h2>{baker.business_name}</h2><p>{[baker.city,baker.postal_code].filter(Boolean).join(" · ")||"Germany"}</p></div></div><p style={{color:"#75675F",fontSize:13,lineHeight:1.55,minHeight:42}}>{baker.bio||"Custom cakes made to order."}</p><div className="tagRow"><span>{baker.minimum_lead_days}d lead time</span>{baker.delivery_radius_km!=null&&<span>{baker.delivery_radius_km} km delivery</span>}</div><div className="listingFooter"><span>{baker.starting_price!=null?<>From <b>{new Intl.NumberFormat("de-DE",{style:"currency",currency:baker.currency||"EUR"}).format(Number(baker.starting_price))}</b></>:"Request a quote"}</span><Link href={`/bakers/${baker.slug||baker.user_id}`}>View & order →</Link></div></div></article>})}</div>}</section><Footer /></main>;
}
