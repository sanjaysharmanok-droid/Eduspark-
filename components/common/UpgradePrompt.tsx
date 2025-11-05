import React, { useContext } from 'react';
import Button from './Button';
import { AppContext } from '../../contexts/AppContext';

interface UpgradePromptProps {
  message: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ message }) => {
  const { setIsSubscriptionModalOpen } = useContext(AppContext);
  return (
    <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.4)] max-w-md mx-auto">
      <p className="font-semibold text-lg text-yellow-400">{message}</p>
      <p className="text-sm my-3 text-yellow-200/80">Upgrade your plan to unlock more features and remove limits.</p>
      <Button 
        onClick={() => setIsSubscriptionModalOpen(true)} 
        className="mt-2 from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg shadow-yellow-500/40 hover:shadow-orange-500/50 focus:ring-yellow-500"
      >
        View Plans
      </Button>
    </div>
  );
};
export default UpgradePrompt;