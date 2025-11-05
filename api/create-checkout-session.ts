// This file should be placed in the `api` directory at the root of your project.
// e.g., /api/create-checkout-session.ts

// The VercelRequest and VercelResponse types give us autocompletion for the request and response objects.
import type { VercelRequest, VercelResponse } from '@vercel/node';
// We import the official Stripe library for Node.js.
import Stripe from 'stripe';

/**
 * =================================================================================================
 * IMPORTANT: CONFIGURE YOUR ENVIRONMENT VARIABLES IN VERCEL
 * =================================================================================================
 * Before deploying, you MUST add your Stripe Secret Key to your Vercel project's settings.
 * 1. Go to your Vercel project dashboard.
 * 2. Click on the "Settings" tab, then "Environment Variables".
 * 3. Add a new variable with the name `STRIPE_SECRET_KEY` and paste your secret key (`sk_test_...`) as the value.
 *
 * This function will then be able to securely access it via `process.env.STRIPE_SECRET_KEY`.
 * NEVER put your secret key directly in the code.
 * =================================================================================================
 */

// The '!' tells TypeScript that we are certain this environment variable will exist after we configure it in Vercel.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // Use the latest API version
});

// This is the main function that will be executed when a request hits `/api/create-checkout-session`.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // We only want to allow POST requests to this endpoint for security.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // We get the tier, user ID, and app URL from the request body sent by the frontend.
    const { tier, userId, appUrl } = req.body;

    // Basic validation to ensure we have the data we need.
    if (!tier || !userId || !appUrl) {
      return res.status(400).json({ message: 'Missing required parameters: tier, userId, appUrl' });
    }

    // =============================================================================================
    // TODO: Replace these placeholder Price IDs with your actual Price IDs from your Stripe Dashboard.
    // =============================================================================================
    // You create these in Stripe under "Product catalog". Each price (e.g., ₹499/month) has a unique ID.
    const priceIds: { [key: string]: string } = {
      silver: 'price_1Pg2bOSJ0AbB7rS9sLKmR0pM', // Replace with your Silver plan Price ID
      gold: 'price_1Pg2cFSJ0AbB7rS9qP2vB8bZ',   // Replace with your Gold plan Price ID
    };

    const priceId = priceIds[tier];
    if (!priceId) {
      return res.status(400).json({ message: 'Invalid subscription tier selected.' });
    }

    // This is the core of the function: we ask the Stripe API to create a new Checkout Session.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      // We tell Stripe what the user is buying.
      line_items: [{ price: priceId, quantity: 1 }],
      // This indicates it's a recurring subscription, not a one-time payment.
      mode: 'subscription',
      // These are the URLs the user will be sent to after completing or canceling the payment.
      success_url: `${appUrl}`,
      cancel_url: `${appUrl}`,
      // This is VERY important. We pass our app's user ID to Stripe.
      // When the payment is successful, Stripe will send this ID back to us in the webhook,
      // so we know which user's account to upgrade in our database.
      client_reference_id: userId,
    });

    // If the session is created successfully, we send its ID back to the frontend.
    res.status(200).json({ sessionId: session.id });

  } catch (error: any) {
    console.error('Stripe API Error:', error.message);
    // If something goes wrong, we send a generic server error response.
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
