import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Modal from './Modal';
import Button from './Button';
import { CheckCircleIcon, XCircleIcon } from '../icons';
import { initiatePayment } from '../../services/paymentService';
import { SubscriptionTier } from '../../types';

const TierCard: React.FC<{
    tier: string;
    price: string;
    description: string;
    features: { text: string; included: boolean }[];
    currentTier: string;
    onSelect: (tier: 'silver' | 'gold') => void;
    isLoading: boolean;
    isPopular?: boolean;
}> = ({ tier, price, description, features, currentTier, onSelect, isLoading, isPopular = false }) => {
    
    const tierKey = tier.toLowerCase() as 'free' | 'silver' | 'gold';
    const isCurrent = currentTier === tierKey;

    return (
        <div className={`relative flex flex-col rounded-2xl p-6 transition-all duration-300 transform hover:-translate-y-1
            ${isCurrent 
                ? 'bg-white dark:bg-slate-800 border-2 border-purple-500 shadow-2xl shadow-purple-500/20' 
                : 'bg-white/60 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700'
            }`}>
            {isPopular && <div className="absolute top-0 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full left-1/2 -translate-x-1/2 shadow-lg">POPULAR</div>}
            
            <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-white">{tier}</h3>
            <p className="mt-2 text-4xl font-extrabold text-center text-slate-900 dark:text-white">{price}</p>
            <p className="mt-1 text-sm text-center text-slate-500 dark:text-slate-400">{description}</p>
            
            <div className="my-6 border-t border-gray-200 dark:border-slate-700"></div>

            <ul className="space-y-3 text-sm flex-1">
                {features.map(feature => (
                    <li key={feature.text} className="flex items-start space-x-3">
                        {feature.included ? <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" /> : <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />}
                        <span className="text-slate-600 dark:text-slate-300">{feature.text}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-8">
                {isCurrent ? (
                    <button className="w-full font-bold py-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white cursor-default shadow-md" disabled>Current Plan</button>
                ) : (
                    <Button 
                        onClick={() => onSelect(tierKey as 'silver' | 'gold')} 
                        isLoading={isLoading}
                        className={`w-full ${tierKey === 'free' ? 'hidden' : ''} ${isPopular ? '' : 'from-gray-500 to-slate-600 hover:shadow-slate-500/50'}`}>
                        {isLoading ? 'Processing...' : (currentTier === 'free' ? 'Upgrade Plan' : (tierKey === 'gold' ? 'Upgrade' : 'Downgrade'))}
                    </Button>
                )}
            </div>
        </div>
    );
};

const SubscriptionModal: React.FC = () => {
    const { isSubscriptionModalOpen, setIsSubscriptionModalOpen, subscriptionTier, firebaseUser, user, language, appConfig } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePlanSelect = async (tier: 'silver' | 'gold') => {
        if (!firebaseUser || !user) {
            setError("You must be logged in to upgrade your plan. Guest users cannot subscribe.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await initiatePayment(tier, firebaseUser.uid, user.email, user.name, language);
        } catch (err: any) {
            console.error("Payment initiation failed:", err);
            // Don't show an error if the user just closed the modal.
            if (err.message !== "Payment window closed." && err.message !== "Transaction Cancelled by User") {
                 setError(err.message || "Could not start the payment process. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const planData = {
        free: {
            price: 'Free',
            description: 'For casual learners',
            features: [
                { text: '5 Topic Searches / day', included: true },
                { text: '5 Homework Helps / day', included: true },
                { text: '100 Quiz Questions / day', included: true },
                { text: 'Limited tool access', included: true },
                { text: '500 bonus credits on signup', included: true },
                { text: 'Visual Assistant (10 credits/use)', included: true },
                { text: 'Ad-Supported', included: true },
            ],
        },
        silver: {
            price: appConfig?.planPrices.silver || '₹499/mo',
            description: 'For dedicated students & teachers',
            features: [
                { text: 'Unlimited Topic Searches', included: true },
                { text: 'Unlimited Homework Helps', included: true },
                { text: 'Unlimited Quiz Questions', included: true },
                { text: 'Full tool access', included: true },
                { text: '1000 credits / month', included: true },
                { text: 'Visual Assistant (10 credits/use)', included: true },
                { text: 'Ad-Supported', included: true },
            ],
        },
        gold: {
            price: appConfig?.planPrices.gold || '₹999/mo',
            description: 'For power users & professionals',
            features: [
                { text: 'All Silver features, plus:', included: true },
                { text: 'Ad-Free Experience', included: true },
                { text: '3000 credits / month', included: true },
                { text: 'Priority access to new features', included: true },
                { text: 'Enhanced AI models', included: true },
                { text: 'Premium Support', included: true },
                { text: 'Visual Assistant (10 credits/use)', included: true },
            ],
        }
    };

    return (
        <Modal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} title="Choose the plan that best fits your educational journey.">
            <div className="p-2">
                {error && (
                    <div className="mb-4 p-3 text-center bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200 rounded-lg">
                        <p className="font-semibold">Payment Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    <TierCard
                        tier="Free"
                        price={planData.free.price}
                        description={planData.free.description}
                        features={planData.free.features}
                        currentTier={subscriptionTier}
                        onSelect={() => {}}
                        isLoading={false}
                    />
                     <TierCard
                        tier="Silver"
                        price={planData.silver.price}
                        description={planData.silver.description}
                        features={planData.silver.features}
                        currentTier={subscriptionTier}
                        onSelect={handlePlanSelect}
                        isLoading={isLoading}
                    />
                     <TierCard
                        tier="Gold"
                        price={planData.gold.price}
                        description={planData.gold.description}
                        features={planData.gold.features}
                        currentTier={subscriptionTier}
                        onSelect={handlePlanSelect}
                        isLoading={isLoading}
                        isPopular
                    />
                </div>
            </div>
        </Modal>
    );
};

export default SubscriptionModal;