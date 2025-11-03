import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Modal from './Modal';
import Button from './Button';

const CheckIcon = () => (
    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);
const XIcon = () => (
    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
)

const TierCard: React.FC<{
    tier: string,
    price: string,
    features: { name: string, free: boolean, silver: boolean, gold: boolean }[],
    currentTier: string,
    onSelect: () => void,
    isPopular?: boolean,
}> = ({ tier, price, features, currentTier, onSelect, isPopular = false }) => {
    
    const tierKey = tier.toLowerCase() as 'free' | 'silver' | 'gold';

    return (
        <div className={`glass-card rounded-xl p-6 flex flex-col ${currentTier === tierKey ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-white/20'} ${isPopular ? 'relative' : ''}`}>
            {isPopular && <div className="absolute top-0 -translate-y-1/2 px-3 py-1 bg-indigo-500 text-white text-xs font-semibold rounded-full left-1/2 -translate-x-1/2">POPULAR</div>}
            <h3 className="text-2xl font-bold text-white text-center">{tier}</h3>
            <p className="mt-2 text-gray-400 text-center">{price}</p>
            <ul className="mt-6 space-y-4 text-sm flex-1">
                {features.map(feature => (
                    <li key={feature.name} className="flex items-center space-x-3">
                        {feature[tierKey] ? <CheckIcon/> : <XIcon />}
                        <span className="text-gray-300">{feature.name}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-8">
                {currentTier === tierKey ? (
                    <Button className="w-full bg-white/20 cursor-default" disabled>Current Plan</Button>
                ) : (
                    <Button onClick={onSelect} className={`w-full ${tierKey === 'free' ? 'hidden' : ''}`}>
                        {currentTier === 'free' ? 'Upgrade' : (tierKey === 'gold' ? 'Upgrade' : 'Downgrade')}
                    </Button>
                )}
            </div>
        </div>
    );
};


const SubscriptionModal: React.FC = () => {
    const { isSubscriptionModalOpen, setIsSubscriptionModalOpen, subscriptionTier, upgradeSubscription } = useContext(AppContext);

    const features = [
        { name: 'Ad-Free Experience', free: false, silver: false, gold: true },
        { name: 'Unlimited Quiz Questions', free: false, silver: true, gold: true },
        { name: 'Unlimited Topic Searches', free: false, silver: true, gold: true },
        { name: 'Unlimited Homework Helps', free: false, silver: true, gold: true },
        { name: 'Daily Credits', free: false, silver: true, gold: true },
        { name: 'Monthly Free Credits', free: true, silver: false, gold: false },
    ];

    return (
        <Modal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} title="Upgrade Your Plan">
            <div className="p-2">
                <p className="text-center text-gray-300 mb-8">Choose the plan that best fits your needs.</p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <TierCard
                        tier="Free"
                        price="100 Credits Monthly"
                        features={features}
                        currentTier={subscriptionTier}
                        onSelect={() => {}}
                    />
                     <TierCard
                        tier="Silver"
                        price="30 Credits Daily"
                        features={features}
                        currentTier={subscriptionTier}
                        onSelect={() => upgradeSubscription('silver')}
                    />
                     <TierCard
                        tier="Gold"
                        price="100 Credits Daily"
                        features={features}
                        currentTier={subscriptionTier}
                        onSelect={() => upgradeSubscription('gold')}
                        isPopular
                    />
                </div>
            </div>
        </Modal>
    );
};

export default SubscriptionModal;