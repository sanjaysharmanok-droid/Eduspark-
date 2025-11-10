import React from 'react';
import Card from '../common/Card';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="animate-fade-in-up">
      <Card>
        <div className="prose dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>
          <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
          
          <p>Welcome to EduSpark AI, a service provided by <strong>Vinayak Shikshan Sansthan Ankhisar</strong> ("we," "us," or "our"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.</p>

          <h2>Information We Collect</h2>
          <p>We may collect information about you in a variety of ways. The information we may collect includes:</p>
          <ul>
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, which you provide to us when you register with the application (e.g., through Google Sign-In).</li>
            <li><strong>Usage Data:</strong> Information our servers automatically collect when you access the application, such as your IP address, browser type, and the pages you have viewed. We also track feature usage to manage subscription limits.</li>
            <li><strong>User-Generated Content:</strong> Any text, images, or other content you provide when using our tools (e.g., prompts for homework help, topics for lesson plans). This data is sent to our AI service providers (like Google's Gemini API) to generate responses and is not stored permanently on our servers in connection with your personal account.</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>Having accurate information permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you to:</p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Fulfill and manage subscriptions and payments.</li>
            <li>Monitor and analyze usage and trends to improve your experience.</li>
            <li>Prevent fraudulent transactions and monitor against theft.</li>
            <li>Respond to your requests and provide customer support.</li>
          </ul>

          <h2>Disclosure of Your Information</h2>
          <p>We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information. This does not include trusted third parties who assist us in operating our application, conducting our business, or servicing you, so long as those parties agree to keep this information confidential (e.g., Google for authentication, Stripe/Cashfree for payments).</p>
          
          <h2>Security of Your Information</h2>
          <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>

          <h2>Contact Us</h2>
          <p>If you have questions or comments about this Privacy Policy, please contact us at: <a href="mailto:help@edusparks.online">help@edusparks.online</a>. The service is operated by <strong>Vinayak Shikshan Sansthan Ankhisar</strong>.</p>
        </div>
      </Card>
    </div>
  );
};

export default PrivacyPolicyPage;