// In /api/create-cashfree-order.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';
// We need to import the Cashfree SDK.
import { Cashfree } from 'cashfree-pg';

/**
 * =================================================================================================
 * IMPORTANT: CONFIGURE YOUR CASHFREE ENVIRONMENT VARIABLES IN VERCEL
 * =================================================================================================
 * 1. `CASHFREE_APP_ID`: Your Cashfree App ID from the developer dashboard.
 * 2. `CASHFREE_SECRET_KEY`: Your Cashfree Secret Key from the developer dashboard.
 * =================================================================================================
 */

// Initialize Cashfree with credentials from environment variables.
Cashfree.XClientId = process.env.CASHFREE_APP_ID!;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY!;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX; // Use SANDBOX for testing, PRODUCTION for live payments.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { tier, userId, userEmail, userName, returnUrl } = req.body;

    if (!tier || !userId || !userEmail || !userName) {
      return res.status(400).json({ message: 'Missing required parameters.' });
    }

    // Map your app's tiers to prices in Rupees.
    const tierPrices: { [key: string]: number } = {
      silver: 499,
      gold: 999,
    };

    const orderAmount = tierPrices[tier];
    if (!orderAmount) {
      return res.status(400).json({ message: 'Invalid tier selected.' });
    }
    
    // Create a unique order ID for this transaction.
    const orderId = `EDUSPARK-${userId}-${Date.now()}`;

    const orderRequest = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: "INR",
      order_note: `EduSpark AI ${tier} plan for user ${userId}`,
      customer_details: {
        customer_id: userId,
        customer_email: userEmail,
        customer_name: userName,
      },
      // You can also add subscription details here if setting up recurring payments
      // For a one-time charge (which is simpler to start with), this is sufficient.
    };

    // Call the Cashfree API to create the order.
    const response = await Cashfree.PG.Orders.CreateOrder(orderRequest);
    
    const paymentSessionId = response.data.payment_session_id;

    // Send the session ID back to the frontend.
    res.status(200).json({ paymentSessionId });

  } catch (error: any) {
    console.error('Cashfree API Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Internal Server Error', error: error.response?.data || error.message });
  }
}