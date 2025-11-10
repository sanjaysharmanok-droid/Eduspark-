import React from 'react';
import Card from '../common/Card';

const TermsAndConditionsPage: React.FC = () => {
  return (
    <div className="animate-fade-in-up">
      <Card>
        <div className="prose dark:prose-invert max-w-none">
          <h1>Terms and Conditions</h1>
          <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>

          <h2>1. Agreement to Terms</h2>
          <p>By using the EduSpark AI application ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree, do not use the application.</p>

          <h2>2. Use of Service</h2>
          <p>EduSpark AI provides AI-powered tools for educational purposes. You agree to use these tools responsibly and for their intended purpose. You must not use the service for any illegal or unauthorized purpose.</p>
          
          <h2>3. User Accounts</h2>
          <p>You are responsible for safeguarding your account and for any activities or actions under your account. We encourage you to use a strong password and to keep your account information confidential.</p>
          
          <h2>4. Subscriptions and Payments</h2>
          <p>Some features of the service are billed on a subscription basis. You will be billed in advance on a recurring, periodic basis (e.g., monthly). Your subscription will automatically renew unless you cancel it. All payments are handled by our third-party payment processors (Stripe, Cashfree). We do not store your credit card details. Please see our Refund & Cancellation Policy for more details.</p>

          <h2>5. Intellectual Property</h2>
          <p>The Service and its original content, features, and functionality are and will remain the exclusive property of EduSpark AI. While you own the specific inputs you provide, the generated outputs (e.g., lesson plans, quiz questions) are provided to you under a license for personal and educational use.</p>

          <h2>6. Limitation of Liability</h2>
          <p>The AI-generated content is for informational purposes only and may contain inaccuracies. You should independently verify the information. In no event shall EduSpark AI be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the service.</p>
          
          <h2>7. Changes to Terms</h2>
          <p>We reserve the right to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page.</p>

          <h2>8. Governing Law</h2>
          <p>The EduSpark AI service is provided by <strong>Vinayak Shikshan Sansthan Ankhisar</strong>. These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.</p>
        </div>
      </Card>
    </div>
  );
};

export default TermsAndConditionsPage;