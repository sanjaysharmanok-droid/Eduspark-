import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Card from '../common/Card';
import Button from '../common/Button';
import { SparklesIcon } from '../icons';

const DAILY_LIMITS = {
  topicSearches: 5,
  homeworkHelps: 5,
  summaries: 5,
  presentations: 3,
  lessonPlans: 5,
  activities: 3,
  quizQuestions: 100,
};

const UsageBar: React.FC<{ label: string; used: number; total: number }> = ({ label, used, total }) => {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">{used} / {total}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

const PlanInformation: React.FC = () => {
  const { subscriptionTier, credits, usage, setIsSubscriptionModalOpen, userRole } = useContext(AppContext);

  const isFreeTier = subscriptionTier === 'free';
  const studentFeatures = ['topicSearches', 'homeworkHelps', 'summaries', 'quizQuestions'] as const;
  const teacherFeatures = ['lessonPlans', 'activities', 'presentations', 'summaries', 'quizQuestions'] as const;
  const featuresToShow = userRole === 'teacher' ? teacherFeatures : studentFeatures;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h3 className="text-sm font-semibold uppercase text-indigo-600 dark:text-indigo-400">Current Plan</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white capitalize">{subscriptionTier}</p>
          </div>
          <div className="text-left md:text-right">
            <h3 className="text-sm font-semibold uppercase text-indigo-600 dark:text-indigo-400">Available Credits</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{credits}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Used for Visual Assistant</p>
          </div>
        </div>
        {subscriptionTier !== 'gold' && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 text-center">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Unlock Your Full Potential</h4>
            <p className="text-gray-600 dark:text-gray-400 my-2 max-w-lg mx-auto">Upgrade to a premium plan for unlimited feature access, more credits, and an ad-free experience.</p>
            <Button onClick={() => setIsSubscriptionModalOpen(true)} className="mt-2">
              <SparklesIcon className="w-5 h-5 mr-2"/>
              Upgrade Plan
            </Button>
          </div>
        )}
      </Card>
      
      <Card title="Daily Usage">
        {isFreeTier ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your daily usage resets at midnight. Upgrade to a premium plan for unlimited access.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuresToShow.map(feature => (
                 <UsageBar 
                    key={feature} 
                    label={feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} // Format name
                    used={usage[feature] || 0}
                    total={DAILY_LIMITS[feature]}
                 />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-blue-500 text-white">
                <SparklesIcon className="w-8 h-8"/>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">You have unlimited access!</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              As a <span className="capitalize font-semibold">{subscriptionTier}</span> subscriber, you can use all core features without daily limits.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PlanInformation;
