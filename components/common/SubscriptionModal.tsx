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
        <div className={`glass-card rounded-2xl p-6 flex flex-col transition-all duration-300 ${isCurrent ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-white/20'} ${isPopular ? 'relative' : ''}`}>
            {isPopular && <div className="absolute top-0 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full left-1/2 -translate-x-1/2 shadow-lg">POPULAR</div>}
            <h3 className="text-2xl font-bold text-white text-center">{tier}</h3>
            <p className="mt-2 text-4xl font-extrabold text-white text-center">{price}</p>
            <p className="text-sm text-gray-400 text-center">{description}</p>
            
            <div className="border-t border-white/10 my-6"></div>

            <ul className="space-y-3 text-sm flex-1">
                {features.map(feature => (
                    <li key={feature.text} className="flex items-start space-x-3">
                        {feature.included ? <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" /> : <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />}
                        <span className="text-gray-300">{feature.text}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-8">
                {isCurrent ? (
                    <Button className="w-full bg-white/20 hover:bg-white/20 cursor-default" disabled>Current Plan</Button>
                ) : (
                    <Button 
                        onClick={() => onSelect(tierKey as 'silver' | 'gold')} 
                        isLoading={isLoading}
                        className={`w-full ${tierKey === 'free' ? 'hidden' : ''} ${isPopular ? '' : 'from-gray-600 to-slate-700 hover:shadow-slate-500/50'}`}>
                        {isLoading ? 'Processing...' : (currentTier === 'free' ? 'Upgrade Plan' : (tierKey === 'gold' ? 'Upgrade' : 'Downgrade'))}
                    </Button>
                )}
            </div>
        </div>
    );
};

const SubscriptionModal: React.FC = () => {
    const { isSubscriptionModalOpen, setIsSubscriptionModalOpen, subscriptionTier, firebaseUser } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePlanSelect = async (tier: 'silver' | 'gold') => {
        if (!firebaseUser) {
            setError("You must be logged in to upgrade your plan. Guest users cannot subscribe.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await initiatePayment(tier, firebaseUser.uid);
            // If initiatePayment is successful, it will redirect the user to Stripe.
            // There's no need to handle a success case here, as the page will navigate away.
        } catch (err: any) {
            console.error("Payment initiation failed:", err);
            setError(err.message || "Could not start the payment process. Please try again.");
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
            price: '₹499/mo',
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
            price: '₹999/mo',
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
        <Modal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} title="Upgrade Your Plan">
            <div className="p-2">
                <p className="text-center text-gray-300 mb-8">Choose the plan that best fits your educational journey.</p>
                {error && (
                    <div className="mb-4 p-3 text-center bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg">
                        <p className="font-semibold">Payment Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
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
