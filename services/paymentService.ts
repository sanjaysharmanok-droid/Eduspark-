// This is a global object that will be available after the Cashfree SDK is dynamically loaded.
declare const cashfree: any;

/**
 * Loads the Cashfree SDK script dynamically onto the page.
 * This ensures the SDK is available before we try to use it.
 * @returns A promise that resolves when the script is loaded.
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
 *
 * @param tier The subscription tier the user wants to upgrade to ('silver' or 'gold').
 * @param userId The unique ID of the user making the purchase.
 * @param userEmail The email of the user.
 * @param userName The name of the user.
 */
export const initiatePayment = async (tier: 'silver' | 'gold', userId: string, userEmail: string, userName: string): Promise<void> => {
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

  // Wrap the Cashfree checkout call in a promise for better error handling.
  return new Promise<void>((resolve, reject) => {
    const checkoutOptions = {
      paymentSessionId: paymentSessionId,
    };
    
    cashfree.checkout(checkoutOptions).then((result: any) => {
        if (result.error) {
            // This error occurs if the modal fails to initialize or the user closes it.
            reject(new Error(result.error.message || "Payment window closed."));
        } else if (result.paymentDetails || result.redirect) {
            // Payment was successful on the client or redirected.
            // The final source of truth will be the webhook.
            resolve();
        } else {
             // This case handles when the user closes the modal before completing the payment.
            reject(new Error("Payment window closed."));
        }
    });
  });
};
