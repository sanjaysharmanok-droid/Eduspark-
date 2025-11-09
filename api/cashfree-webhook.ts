// In /api/cashfree-webhook.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { buffer } from 'micro';
import { Buffer } from 'buffer';

export const config = {
    api: {
        bodyParser: false,
    },
};

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
  
  try {
    const event = JSON.parse(rawBody.toString());
    if (event.type === "TEST_WEBHOOK") {
      console.log("✅ Received Cashfree test webhook. Responding with success.");
      return res.status(200).json({ status: 'Test webhook received successfully!' });
    }
  } catch (e) {}

  const signature = req.headers['x-webhook-signature'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  
  if (!verifyCashfreeSignature(signature, timestamp, rawBody)) {
    console.error('⚠️ Webhook signature verification failed. Make sure CASHFREE_WEBHOOK_SECRET is set correctly.');
    return res.status(401).send('Unauthorized');
  }

  try {
    const event = JSON.parse(rawBody.toString());
    
    if (event.type === "PAYMENT_SUCCESS_WEBHOOK" && event.data.order.order_status === "PAID") {
      const order = event.data.order;
      const customer = event.data.customer;
      const userId = customer.customer_id;
      const orderAmount = order.order_amount;

      const amountToTier: { [key: number]: string } = { 499: 'silver', 999: 'gold' };
      const newTier = amountToTier[orderAmount];

      if (userId && newTier) {
          const userRef = db.collection("users").doc(userId);
          const paymentRef = db.collection("payments").doc();

          const batch = db.batch();
          
          batch.update(userRef, { 
            "subscription.tier": newTier,
            "subscription.status": 'active'
          });

          batch.set(paymentRef, {
              userId: userId,
              userEmail: customer.customer_email,
              tier: newTier,
              amount: order.order_amount,
              currency: order.order_currency,
              provider: 'cashfree',
              transactionId: order.order_id,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });

          await batch.commit();
          console.log(`✅ Successfully updated user ${userId} to ${newTier} tier and logged payment.`);
      } else {
        console.warn(`⚠️ Could not determine tier for order ${order.order_id} or missing user ID.`);
      }
    }
    
    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error("Error processing Cashfree webhook:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}