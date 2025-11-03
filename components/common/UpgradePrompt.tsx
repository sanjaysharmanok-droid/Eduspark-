import React, { useContext } from 'react';
import Card from './Card';
import Button from './Button';
import { AppContext } from '../../contexts/AppContext';

interface UpgradePromptProps {
  message: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ message }) => {
  const { setIsSubscriptionModalOpen } = useContext(AppContext);
  return (
    <Card className="bg-yellow-100 dark:bg-yellow-500/10 border-yellow-300 dark:border-yellow-500/30 text-center">
      <p className="font-semibold text-yellow-800 dark:text-yellow-200">{message}</p>
      <p className="text-sm my-2 text-yellow-700 dark:text-yellow-300/80">Upgrade your plan to unlock more features and remove limits.</p>
      <Button onClick={() => setIsSubscriptionModalOpen(true)} className="mt-2 from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 hover:shadow-orange-500/50">
        View Plans
      </Button>
    </Card>
  );
};
export default UpgradePrompt;