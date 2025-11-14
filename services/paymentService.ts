import { AppConfig } from '../types';

// This is a global object that will be available after the Cashfree SDK is dynamically loaded.
declare const cashfree: any;
// This is a global object that will be available after the Stripe SDK is loaded.
declare const Stripe: any;

/**
 * =================================================================================================
 * IMPORTANT: ADD YOUR STRIPE PUBLISHABLE KEY
 * =================================================================================================
 * This is a client-side key and is safe to expose in your frontend code.
 * You can find this key in your Stripe Dashboard under Developers > API keys.
 * It should start with `pk_test_...` for test mode or `pk_live_...` for live mode.
 * =================================================================================================
 */
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Pg2bOSJ0AbB7rS999DFzEwFmDtlXM3fV0TA5f4sd2R01yHkFvM5bQW9LpXbY4gZ6c7V8jI9k0a1b2c3d4e5f6g7'; // REPLACE WITH YOUR KEY

/**
 * Initiates the Stripe payment process.
 */
const initiateStripePayment = async (tier: 'silver' | 'gold', userId: string): Promise<void> => {
    console.log(`Initiating Stripe payment for ${tier} tier for user ${userId}.`);

    if (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY.includes('REPLACE')) {
         throw new Error('Stripe publishable key is not configured. Please add it in `services/paymentService.ts`.');
    }

    const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

    const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tier,
            userId,
            appUrl: window.location.origin, // Pass the current domain for success/cancel URLs
        }),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || 'Failed to create Stripe checkout session.');
    }

    const { sessionId } = await response.json();
    if (!sessionId) {
        throw new Error('Did not receive a session ID from the server.');
    }

    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
        console.error("Stripe redirectToCheckout error:", error);
        throw new Error(error.message || "Failed to redirect to Stripe checkout.");
    }
};

/**
 * Loads the Cashfree SDK script dynamically onto the page.
 */
const loadCashfreeSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById('cashfree-sdk')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'cashfree-sdk';
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Cashfree SDK failed to load.'));
    document.body.appendChild(script);
  });
};

/**
 * Initiates the payment process for a selected subscription tier using Cashfree.
 */
const initiateCashfreePayment = async (tier: 'silver' | 'gold', userId: string, userEmail: string, userName: string): Promise<void> => {
  console.log(`Initiating Cashfree payment for ${tier} tier for user ${userId}.`);

  await loadCashfreeSDK();

  const response = await fetch('/api/create-cashfree-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tier,
      userId,
      userEmail,
      userName,
      appUrl: window.location.origin, // Pass the current domain for the return URL
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.message || 'Failed to create Cashfree order.');
  }

  const { paymentSessionId } = await response.json();

  if (!paymentSessionId) {
    throw new Error('Did not receive a payment session ID from the server.');
  }

  return new Promise<void>((resolve, reject) => {
    const checkoutOptions = {
      paymentSessionId: paymentSessionId,
    };
    
    cashfree.checkout(checkoutOptions).then((result: any) => {
        if (result.error) {
            reject(new Error(result.error.message || "Payment window closed."));
        } else if (result.paymentDetails || result.redirect) {
            resolve();
        } else {
            reject(new Error("Payment window closed."));
        }
    });
  });
};

/**
 * Orchestrates the payment process, selecting the appropriate provider based on user language and admin settings.
 */
export const initiatePayment = async (
    tier: 'silver' | 'gold',
    userId: string,
    userEmail: string,
    userName: string,
    language: string,
    appConfig: AppConfig | null
): Promise<void> => {
    const isCashfreeEnabled = appConfig?.paymentSettings.gateways.find(g => g.provider === 'cashfree')?.enabled;
    const isStripeEnabled = appConfig?.paymentSettings.gateways.find(g => g.provider === 'stripe')?.enabled;

    // Use Cashfree for users with Hindi language preference (likely in India), if enabled.
    if (language === 'hi' && isCashfreeEnabled) {
        return initiateCashfreePayment(tier, userId, userEmail, userName);
    }
    
    // Use Stripe for others (international), if enabled.
    if (isStripeEnabled) {
        return initiateStripePayment(tier, userId);
    }

    // Fallback if the preferred gateway is disabled
    if (isCashfreeEnabled) {
        return initiateCashfreePayment(tier, userId, userEmail, userName);
    }

    throw new Error("No payment gateways are currently enabled. Please contact support.");
};
