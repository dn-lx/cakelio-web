import Stripe from "stripe";

let stripeClient: Stripe | null = null;
export function getStripeClient(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to the server environment.");if(!stripeClient)stripeClient=new Stripe(key,{maxNetworkRetries:2,appInfo:{name:"Cakelio",version:"0.4.0",url:"https://cakelio.de"}});return stripeClient;}
