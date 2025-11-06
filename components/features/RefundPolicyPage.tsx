import React from 'react';
import Card from '../common/Card';

const RefundPolicyPage: React.FC = () => {
  return (
    <div className="animate-fade-in-up">
      <Card>
        <div className="prose dark:prose-invert max-w-none">
          <h1>Refund & Cancellation Policy</h1>
          <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>

          <p>Thank you for subscribing to EduSpark AI. We are committed to ensuring customer satisfaction with our services. This policy outlines the terms for cancellations and refunds for our subscription plans.</p>

          <h2>Subscription Cancellation</h2>
          <p>
            You may cancel your recurring subscription at any time. To cancel, please contact our support team at <a href="mailto:help@edusparks.online">help@edusparks.online</a> with your account details.
          </p>
          <p>
            When you cancel your subscription, the cancellation will take effect at the end of your current billing period. You will continue to have access to the premium features of your subscription until the end of the billing cycle. We will not charge you for any subsequent billing cycles after the cancellation.
          </p>

          <h2>Refund Policy</h2>
          <p>
            Generally, all subscription fees are non-refundable. We do not provide refunds or credits for any partial subscription periods or unused services. Once a payment has been processed, it is final.
          </p>
          <p>
            We may, at our sole discretion, consider refunds on a case-by-case basis under exceptional circumstances. If you believe you have exceptional circumstances that warrant a refund, please contact our support team within 7 days of the transaction.
          </p>
          <p>
            Any refunds, if approved, will be processed through the original method of payment. Please allow up to 10-15 business days for the refund to reflect in your account, depending on your bank or payment provider.
          </p>
          
          <h2>Contact Us</h2>
          <p>If you have any questions about our Refund and Cancellation Policy, please contact us.</p>
          <ul>
            <li><strong>Support Email:</strong> <a href="mailto:help@edusparks.online">help@edusparks.online</a></li>
            <li><strong>Legal Business Name:</strong> Vinayak Shikshan Sansthan</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default RefundPolicyPage;