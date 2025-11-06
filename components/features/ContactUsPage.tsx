import React from 'react';
import Card from '../common/Card';

const ContactUsPage: React.FC = () => {
  return (
    <div className="animate-fade-in-up">
      <Card>
        <div className="prose dark:prose-invert max-w-none">
          <h1>Contact Us</h1>
          <p>
            We'd love to hear from you! Whether you have a question about features, trials, pricing, or anything else, our team is ready to answer all your questions.
          </p>

          <h2>Get in Touch</h2>
          <p>
            The best way to reach us is by email. We aim to respond to all inquiries within 24-48 business hours.
          </p>
          <p>
            <strong>Support Email:</strong> <a href="mailto:help@edusparks.online">help@edusparks.online</a>
          </p>
          
          <h2>Legal & Business Information</h2>
          <p>
            For official correspondence, please use the details below.
          </p>
          <ul>
            <li><strong>Legal Business Name:</strong> Vinayak Shikshan Sansthan</li>
            <li><strong>Business Address:</strong> Ankhisar, Bikaner, Rajasthan 334803, India</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default ContactUsPage;