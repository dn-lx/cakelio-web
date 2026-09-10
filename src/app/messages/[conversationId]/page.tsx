import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ChatClient } from "@/components/ChatClient";
import { createClient } from "@/lib/supabase/server";

export default async function ConversationPage({params}:{params:Promise<{conversationId:string}>}){const {conversationId}=await params;const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect("/auth");const {data:conversation}=await supabase.from("conversations").select("id,request_id,customer_id,provider_id").eq("id",conversationId).maybeSingle();if(!conversation)notFound();const isCustomer=conversation.customer_id===userId;let title="Customer cake request";if(isCustomer){const {data:baker}=await supabase.from("provider_profiles").select("business_name").eq("user_id",conversation.provider_id).maybeSingle();title=baker?.business_name||"Your baker";}return <main><Nav/><ChatClient conversationId={conversation.id} currentUserId={userId} title={title} requestId={conversation.request_id}/></main>}
