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
      // Delayed methods can complete Checkout while payment is still pending.
      if (session.payment_status !== "unpaid") await recordSuccessfulCheckout(session);
    } else if (event.type === "checkout.session.async_payment_succeeded") {
      await recordSuccessfulCheckout(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "checkout.session.async_payment_failed") {
      await recordFailedCheckout(event.data.object as Stripe.Checkout.Session);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 500 },
    );
  }
}

async function recordSuccessfulCheckout(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  const admin = createAdminClient();
  const { data: existingPayment, error: existingPaymentError } = await admin
    .from("payments")
    .select("id,status")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (existingPaymentError) throw existingPaymentError;
  if (existingPayment?.status === "paid") return;

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,total,currency,customer_id,provider_id,status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error("Order referenced by Stripe was not found.");

  const paid = Number(session.amount_total || 0) / 100;
  const intent = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;

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

  // Derive amount_paid from recorded successful payments so webhook retries are idempotent.
  const { data: successfulPayments, error: successfulPaymentsError } = await admin
    .from("payments")
    .select("amount")
    .eq("order_id", order.id)
    .eq("status", "paid");
  if (successfulPaymentsError) throw successfulPaymentsError;

  const paidTotal = (successfulPayments || []).reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const newAmount = Math.min(Number(order.total), paidTotal);
  const paymentStatus = newAmount >= Number(order.total) ? "paid" : "partially_paid";
  const existingStatus = String(order.status || "confirmed");
  const nextOrderStatus = paymentStatus === "paid"
    ? (["in_progress", "ready", "completed"].includes(existingStatus) ? existingStatus : "confirmed")
    : "deposit_paid";

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

async function recordFailedCheckout(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id,currency,customer_id,provider_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) return;

  const intent = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;

  const { error: paymentError } = await admin.from("payments").upsert({
    order_id: order.id,
    customer_id: order.customer_id,
    provider_id: order.provider_id,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: intent,
    payment_kind: session.metadata?.payment_kind || "full",
    amount: Number(session.amount_total || 0) / 100,
    currency: String(order.currency || "EUR").toUpperCase(),
    status: "failed",
    paid_at: null,
  }, { onConflict: "stripe_checkout_session_id" });
  if (paymentError) throw paymentError;

  const { error: notificationError } = await admin.from("notifications").insert({
    user_id: order.customer_id,
    kind: "payment_failed",
    title: "Payment unsuccessful",
    body: "Your cake order payment did not complete. You can try again from your Cakelio account.",
    link: "/account?section=orders",
  });
  if (notificationError) throw notificationError;
}
