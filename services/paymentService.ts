import { SubscriptionTier } from '../types';

// This is a global object that will be available after including the Stripe.js script.
declare const Stripe: any;

/**
 * Initiates the payment process for a selected subscription tier by calling our secure backend.
 *
 * @param tier The subscription tier the user wants to upgrade to ('silver' or 'gold').
 * @param userId The unique ID of the user making the purchase.
 */
export const initiatePayment = async (tier: 'silver' | 'gold', userId: string): Promise<void> => {
  console.log(`Initiating payment for ${tier} tier for user ${userId}.`);

  // STEP 1: Get the Stripe instance. The Stripe.js script is loaded in index.html.
  // Replace the placeholder with your *actual* Stripe PUBLISHABLE key.
  const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY'); // IMPORTANT: Replace this key!

  // STEP 2: Make a POST request to our secure backend endpoint.
  // Vercel allows us to use a relative path, which is very convenient.
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      tier: tier,
      userId: userId,
      appUrl: window.location.origin // Send the base URL of the app for success/cancel redirects
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    // Throw an error that can be caught by the component calling this function.
    throw new Error(errorBody.message || 'Failed to create checkout session.');
  }

  const { sessionId } = await response.json();

  if (!sessionId) {
      throw new Error('Did not receive a session ID from the server.');
  }

  // STEP 3: Use the session ID to redirect to Stripe's secure checkout page.
  const { error } = await stripe.redirectToCheckout({ sessionId });

  // This part of the code is only reached if there's an immediate error
  // during the redirect (e.g., network issue).
  if (error) {
    console.error('Stripe redirect error:', error);
    throw new Error(error.message);
  }

  // If the redirect is successful, the user will be taken to Stripe's website.
  // They will be returned to your app after they complete or cancel the payment.
  // The webhook you will set up in the next steps will handle updating their subscription.
};
