import { ReactNode } from "react";

export type UserRole = 'student' | 'teacher';
export type Theme = 'light' | 'dark';
export type Language = 'en' | 'hi' | 'es' | 'fr';
export type ResponseStyle = 'Simple' | 'Detailed' | 'Storytelling';
export type PresentationTheme = 'Professional' | 'Creative' | 'Minimalist';
export type SubscriptionTier = 'free' | 'silver' | 'gold';

export interface Usage {
  date: string; // YYYY-MM-DD
  quizQuestions: number;
  topicSearches: number;
  homeworkHelps: number;
  presentations: number;
  lessonPlans: number;
  activities: number;
  summaries: number;
}
export interface User {
  name: string;
  email: string;
  picture: string;
}

export interface LessonPlan {
  title: string;
  gradeLevel: string;
  duration: string;
  learningObjectives: string[];
  materials: string[];
  activities: {
    title: string;
    description: string;
    duration: number;
  }[];
  assessment: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Quiz {
  topic: string;
  questions: QuizQuestion[];
}

export interface PresentationSlide {
  title: string;
  content: string[];
  speakerNotes?: string;
  imageUrl?: string;
}

export interface Presentation {
  topic: string;
  slides: PresentationSlide[];
}

// New types for student library and reports
export interface SavedTopic {
    id: string;
    topic: string;
    explanation: string;
    imageUrl: string | null;
}

export interface LessonList {
    id: string;
    name: string;
    topics: SavedTopic[];
}

export interface QuizAttempt {
    id:string;
    quiz: Quiz;
    userAnswers: (string | null)[];
    score: number;
    date: string;
}

export interface Fact {
  fact: string;
  detail: string;
}

// Types for Admin Panel and App Configuration
export interface FeatureAccessConfig {
  enabled: boolean;
  minTier: SubscriptionTier;
}

export interface UsageLimitsConfig {
  freeTier: {
    [key in keyof Omit<Usage, 'date'>]?: number;
  };
  creditCosts: {
    [key: string]: number; // e.g., visualAssistant: 10
  };
}

export interface PaymentGatewayConfig {
    provider: 'stripe' | 'cashfree' | 'razorpay';
    enabled: boolean;
}

// FIX: Define a specific type for the AI model configuration.
export type ModelConfig = {
    lessonPlanner: string;
    homeworkHelper: string;
    topicExplorer: string;
    presentationGenerator: string;
    quizGenerator: string;
    summarizer: string;
    factFinder: string;
    activityGenerator: string;
    reportCardHelper: string;
    visualAssistant: string;
    imageGeneration: string;
    tts: string;
};

export interface AppConfig {
    planPrices: {
        silver: string;
        gold: string;
    };
    // FIX: Use the specific ModelConfig type for better type safety.
    aiModels: ModelConfig;
    featureAccess: {
        [key: string]: FeatureAccessConfig;
    };
    usageLimits: UsageLimitsConfig;
    superAdmins: string[];
    paymentSettings: {
        gateways: PaymentGatewayConfig[];
    };
}