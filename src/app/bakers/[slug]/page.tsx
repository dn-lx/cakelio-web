import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export default async function BakerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  let query = supabase.from("provider_profiles").select("user_id, slug, business_name, bio, city, postal_code, country_code, website, instagram_handle, delivery_radius_km, minimum_lead_days, starting_price, currency, is_verified, accepting_orders").eq("status","active").eq("is_discoverable",true);
  query = slug.includes("-") ? query.eq("slug",slug) : query.or(`slug.eq.${slug},user_id.eq.${slug}`);
  const { data: baker } = await query.maybeSingle();
  if (!baker) notFound();
  const { data: unavailable } = await supabase.from("provider_availability").select("available_date,status").eq("provider_id",baker.user_id).gte("available_date",new Date().toISOString().slice(0,10)).order("available_date").limit(14);
  const blocked = unavailable?.filter(x=>x.status!=="available")||[];
  return <main><Nav/><section className="shell" style={{paddingBlock:"56px 80px",maxWidth:980}}><span className="eyebrow">CAKELIO BAKER</span><div style={{display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(280px,.8fr)",gap:24,marginTop:14}}><div><h1 style={{fontFamily:"Georgia,serif",fontWeight:500,fontSize:"clamp(42px,6vw,68px)",letterSpacing:-3,margin:"0 0 12px",color:"#352620"}}>{baker.business_name}</h1><p style={{color:"#75675F",fontSize:17,lineHeight:1.7}}>{baker.bio||"Custom cakes designed around your occasion."}</p><div className="tagRow" style={{marginTop:20}}><span>{baker.city||"Germany"}</span><span>{baker.minimum_lead_days} day minimum lead</span>{baker.delivery_radius_km!=null&&<span>{baker.delivery_radius_km} km delivery radius</span>}{baker.is_verified&&<span>✓ Verified</span>}</div>{blocked.length>0&&<div style={{marginTop:28,padding:18,background:"#FFFDF9",border:"1px solid #E6D9CF",borderRadius:16}}><strong>Upcoming unavailable/booked dates</strong><p style={{color:"#75675F",marginBottom:0}}>{blocked.map(x=>`${x.available_date} (${x.status})`).join(" · ")}</p></div>}</div><aside style={{background:"#352620",color:"#FFF8F2",borderRadius:24,padding:26,height:"fit-content"}}><small style={{color:"#C8D3C6",fontWeight:800,letterSpacing:1}}>ORDER WITH THIS BAKER</small><h2 style={{fontFamily:"Georgia,serif",fontWeight:500,fontSize:30,margin:"10px 0"}}>{baker.starting_price!=null?`From ${new Intl.NumberFormat("de-DE",{style:"currency",currency:baker.currency||"EUR"}).format(Number(baker.starting_price))}`:"Request a custom quote"}</h2><p style={{color:"#D2C6BE",lineHeight:1.6}}>Your request creates a private conversation with this baker. They can review your cake brief and send you a quote.</p>{baker.accepting_orders?<Link className="button buttonCream" href={`/order/${baker.user_id}`}>Start order request</Link>:<span>Currently not accepting orders.</span>}</aside></div></section><Footer/></main>;
}
