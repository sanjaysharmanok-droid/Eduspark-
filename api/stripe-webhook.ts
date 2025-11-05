// This file should be placed in the `api` directory at the root of your project.
// e.g., /api/stripe-webhook.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
// `micro` is a helper library Vercel recommends for parsing the raw request body.
import { buffer } from 'micro';
// We need the Firebase Admin SDK to securely modify our database from the backend.
import * as admin from 'firebase-admin';

/**
 * =================================================================================================
 * IMPORTANT: CONFIGURE YOUR ENVIRONMENT VARIABLES IN VERCEL
 * =================================================================================================
 * You MUST add three secrets to your Vercel project's settings for this to work:
 *
 * 1. `STRIPE_SECRET_KEY`: Your Stripe secret key (`sk_test_...`).
 *
 * 2. `STRIPE_WEBHOOK_SECRET`: The webhook signing secret from your Stripe dashboard (`whsec_...`).
 *    You get this after creating the webhook endpoint in Stripe's developer settings.
 *
 * 3. `FIREBASE_SERVICE_ACCOUNT_JSON`: The JSON credentials for your Firebase service account.
 *    - Go to your Firebase project settings > "Service accounts".
 *    - Click "Generate new private key". A JSON file will download.
 *    - Copy the ENTIRE content of that JSON file and paste it as the value for this variable.
 * =================================================================================================
 */

// Initialize Stripe with the secret key from environment variables.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

// Initialize the Firebase Admin SDK ONLY if it hasn't been initialized already.
// This prevents errors during hot-reloading in development.
if (!admin.apps.length) {
  // The service account JSON is parsed from the environment variable.
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
// Get a reference to our Firestore database.
const db = admin.firestore();

// This config is crucial. It tells Vercel to disable its default body parser
// so we can receive the raw request body, which Stripe needs for signature verification.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature']!;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      // This is the critical security step. Stripe uses the signature and our secret
      // to verify that the request is genuinely from Stripe and hasn't been tampered with.
      event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // We are only interested in the event when a checkout session is successfully completed.
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // We retrieve the user ID we passed to Stripe when we created the session.
      const userId = session.client_reference_id;
      
      // We need to fetch the line items from the session to find out which Price ID was purchased.
      // This is more reliable than trying to infer from the total amount.
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;

      // =============================================================================================
      // TODO: Replace these placeholder Price IDs with your actual Price IDs from your Stripe Dashboard.
      // =============================================================================================
      const priceIdToTier: { [key: string]: string } = {
        'price_1Pg2bOSJ0AbB7rS9sLKmR0pM': 'silver', // Replace with your Silver plan Price ID
        'price_1Pg2cFSJ0AbB7rS9qP2vB8bZ': 'gold',   // Replace with your Gold plan Price ID
      };

      const newTier = priceId ? priceIdToTier[priceId] : null;

      if (userId && newTier) {
        try {
          // This is where we update our database. We find the user by their ID
          // and update their subscription tier field.
          await db.collection("users").doc(userId).update({
            "subscription.tier": newTier,
          });
          console.log(`✅ Successfully updated user ${userId} to ${newTier} tier.`);
        } catch (dbError) {
          console.error(`🔥 Database update failed for user ${userId}:`, dbError);
          // If the database update fails, we should return a 500 error so Stripe knows
          // to try sending the webhook again later.
          return res.status(500).json({ message: 'Database update failed.' });
        }
      } else {
        console.warn(`⚠️ Could not determine tier for session ${session.id} or missing user ID.`);
      }
    }
    
    // We send a 200 OK response back to Stripe to acknowledge that we've received the event.
    // If we don't do this, Stripe will keep retrying to send the webhook.
    res.status(200).json({ received: true });

  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}
