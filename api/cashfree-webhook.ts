// In /api/cashfree-webhook.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { buffer } from 'micro';
import { Buffer } from 'buffer';

/**
 * =================================================================================================
 * IMPORTANT: CONFIGURE YOUR ENVIRONMENT VARIABLES IN VERCEL
 * =================================================================================================
 * 1. `CASHFREE_WEBHOOK_SECRET`: The webhook secret from your Cashfree dashboard.
 * 2. `FIREBASE_SERVICE_ACCOUNT_JSON`: Your Firebase service account credentials.
 * =================================================================================================
 */

// This config tells Vercel to not parse the request body,
// so we can access the raw body for signature verification.
export const config = {
    api: {
        bodyParser: false,
    },
};

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase Admin SDK initialization failed:", error);
  }
}
const db = admin.firestore();

// Helper function to verify the webhook signature. This is a critical security step.
const verifyCashfreeSignature = (signature: string, timestamp: string, rawBody: Buffer): boolean => {
    try {
        const secret = process.env.CASHFREE_WEBHOOK_SECRET;
        if (!secret) {
            console.error("CASHFREE_WEBHOOK_SECRET is not set in environment variables.");
            return false;
        }
        const dataToSign = `${timestamp}${rawBody.toString()}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(dataToSign)
            .digest('base64');

        return signature === expectedSignature;
    } catch (error) {
        console.error("Error verifying signature:", error);
        return false;
    }
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const rawBody = await buffer(req);
  
  // First, check if this is the test event from the Cashfree dashboard.
  try {
    const event = JSON.parse(rawBody.toString());
    if (event.type === "TEST_WEBHOOK") {
      console.log("✅ Received Cashfree test webhook. Responding with success.");
      return res.status(200).json({ status: 'Test webhook received successfully!' });
    }
  } catch (e) {
    // Not a JSON body or not a test event, continue to normal processing.
  }

  const signature = req.headers['x-webhook-signature'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  
  // STEP 1: Verify the signature for all real transaction events
  if (!verifyCashfreeSignature(signature, timestamp, rawBody)) {
    console.error('⚠️ Webhook signature verification failed. Make sure CASHFREE_WEBHOOK_SECRET is set correctly.');
    return res.status(401).send('Unauthorized');
  }

  try {
    const event = JSON.parse(rawBody.toString());
    
    // STEP 2: Check for a successful payment event.
    if (event.type === "PAYMENT_SUCCESS_WEBHOOK" && event.data.order.order_status === "PAID") {
      const order = event.data.order;
      const customer = event.data.customer;
      
      const userId = customer.customer_id;
      const orderAmount = order.order_amount;

      // Map the order amount back to your app's subscription tiers
      const amountToTier: { [key: number]: string } = {
        499: 'silver',
        999: 'gold',
      };
      
      const newTier = amountToTier[orderAmount];

      if (userId && newTier) {
          // STEP 3: Update the user's subscription tier in your Firestore database.
          await db.collection("users").doc(userId).update({
            "subscription.tier": newTier,
          });
          console.log(`✅ Successfully updated user ${userId} to ${newTier} tier.`);
      } else {
        console.warn(`⚠️ Could not determine tier for order ${order.order_id} or missing user ID.`);
      }
    }
    
    // STEP 4: Send a 200 OK response to Cashfree to acknowledge receipt.
    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error("Error processing Cashfree webhook:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}