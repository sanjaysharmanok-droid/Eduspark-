// This file should be placed in the `api` directory at the root of your project.
// e.g., /api/stripe-webhook.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { buffer } from 'micro';
import * as admin from 'firebase-admin';

/**
 * =================================================================================================
 * IMPORTANT: CONFIGURE YOUR ENVIRONMENT VARIABLES IN VERCEL
 * =================================================================================================
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

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
      event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.client_reference_id;
      const userEmail = session.customer_details?.email;

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;

      const priceIdToTier: { [key: string]: string } = {
        'price_1Pg2bOSJ0AbB7rS9sLKmR0pM': 'silver',
        'price_1Pg2cFSJ0AbB7rS9qP2vB8bZ': 'gold',
      };

      const newTier = priceId ? priceIdToTier[priceId] : null;

      if (userId && newTier) {
        try {
          const userRef = db.collection("users").doc(userId);
          const paymentRef = db.collection("payments").doc();

          const batch = db.batch();

          batch.update(userRef, { 
            "subscription.tier": newTier,
            "subscription.status": 'active'
          });
          
          batch.set(paymentRef, {
              userId: userId,
              userEmail: userEmail || 'N/A',
              tier: newTier,
              amount: (session.amount_total || 0) / 100,
              currency: session.currency,
              provider: 'stripe',
              transactionId: session.id,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          await batch.commit();
          console.log(`✅ Successfully updated user ${userId} to ${newTier} tier and logged payment.`);

        } catch (dbError) {
          console.error(`🔥 Database update failed for user ${userId}:`, dbError);
          return res.status(500).json({ message: 'Database update failed.' });
        }
      } else {
        console.warn(`⚠️ Could not determine tier for session ${session.id} or missing user ID.`);
      }
    }
    
    res.status(200).json({ received: true });

  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}