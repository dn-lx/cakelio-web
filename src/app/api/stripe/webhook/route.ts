import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const signature = (await headers()).get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;

      if (orderId) {
        const admin = createAdminClient();
        const { data: order, error: orderError } = await admin
          .from("orders")
          .select("id,total,amount_paid,currency,customer_id,provider_id,status")
          .eq("id", orderId)
          .maybeSingle();

        if (orderError) throw orderError;
        if (!order) {
          return NextResponse.json({ error: "Order referenced by Stripe was not found." }, { status: 404 });
        }

        const paid = Number(session.amount_total || 0) / 100;
        const newAmount = Math.min(Number(order.total), Number(order.amount_paid || 0) + paid);
        const paymentStatus = newAmount >= Number(order.total) ? "paid" : "partially_paid";
        const intent = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;
        const existingStatus = String(order.status || "confirmed");
        const nextOrderStatus = paymentStatus === "paid"
          ? (["in_progress", "ready", "completed"].includes(existingStatus) ? existingStatus : "confirmed")
          : "deposit_paid";

        const { error: paymentError } = await admin.from("payments").upsert({
          order_id: order.id,
          customer_id: order.customer_id,
          provider_id: order.provider_id,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: intent,
          payment_kind: session.metadata?.payment_kind || "full",
          amount: paid,
          currency: String(order.currency || "EUR").toUpperCase(),
          status: "paid",
          paid_at: new Date().toISOString(),
        }, { onConflict: "stripe_checkout_session_id" });
        if (paymentError) throw paymentError;

        const { error: updateError } = await admin.from("orders").update({
          amount_paid: newAmount,
          payment_status: paymentStatus,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: intent,
          status: nextOrderStatus,
        }).eq("id", order.id);
        if (updateError) throw updateError;

        const { error: notificationError } = await admin.from("notifications").insert({
          user_id: order.provider_id,
          kind: "payment_received",
          title: "Payment received",
          body: `A customer paid ${paid.toFixed(2)} ${String(order.currency || "EUR").toUpperCase()} for an order.`,
          link: "/account?section=orders",
        });
        if (notificationError) throw notificationError;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, { status: 500 });
  }
}
