import React from 'react';
import Card from '../common/Card';
import Logo from '../common/Logo';

const AboutPage: React.FC = () => {
  return (
    <div className="animate-fade-in-up space-y-6">
      <Card>
        <div className="text-center">
            <Logo className="h-20 w-20 mx-auto mb-6 text-indigo-500 dark:text-indigo-400" />
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">About EduSpark AI</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Empowering the next generation of learners and educators through the power of artificial intelligence.
            </p>
        </div>
      </Card>

      <Card>
        <div className="prose dark:prose-invert max-w-none text-lg">
            <h2>Our Mission</h2>
            <p>
                At EduSpark AI, our mission is to make high-quality education accessible, engaging, and personalized for everyone. We believe that AI can be a powerful tool to bridge learning gaps, spark curiosity, and support teachers in their vital work. We are dedicated to creating intuitive, powerful, and safe tools that enhance the educational experience, from kindergarten to higher education and beyond.
            </p>
            <p>
                EduSpark AI is proudly developed and maintained by <strong>Vinayak Shikshan Sansthan Ankhisar</strong>.
            </p>

            <h2>For Students</h2>
            <p>
                We want to be your trusted study partner. Whether you're stuck on a tricky homework problem, exploring a new passion, or preparing for an exam, EduSpark AI is here to help. Our tools are designed to provide clear explanations, generate practice quizzes, and help you visualize complex topics, making learning more effective and enjoyable.
            </p>

            <h2>For Teachers</h2>
            <p>
                We understand the challenges teachers face every day. Our goal is to be your personal assistant, saving you time on administrative tasks so you can focus on what you do best: teaching. From generating creative lesson plans and activities to helping craft insightful report card comments, EduSpark AI is designed to streamline your workflow and inspire your classroom.
            </p>
            
             <h2>Our Commitment to Safety & Ethics</h2>
            <p>
                We are committed to the responsible development of AI in education. We prioritize user privacy, data security, and the creation of age-appropriate content. Our models are continuously reviewed to ensure they provide helpful, harmless, and unbiased information. We believe in a future where technology and human expertise come together to unlock every student's full potential.
            </p>
        </div>
      </Card>
    </div>
  );
};

export default AboutPage;