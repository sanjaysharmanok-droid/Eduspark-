import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../../contexts/AppContext';
import * as firestoreService from '../../../services/firestoreService';
import { AppConfig, SubscriptionTier, PaymentGatewayConfig } from '../../../types';
import Card from '../../common/Card';
import Button from '../../common/Button';
import Spinner from '../../common/Spinner';
import Input from '../../common/Input';
import Select from '../../common/Select';
import { TOOLS } from '../../../constants';
import { useTranslations } from '../../../hooks/useTranslations';

const AppConfiguration: React.FC = () => {
    const { appConfig } = useContext(AppContext);
    const [config, setConfig] = useState<AppConfig | null>(appConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const { t } = useTranslations();

    useEffect(() => {
        if (appConfig) {
            setConfig(JSON.parse(JSON.stringify(appConfig))); // Deep copy to prevent direct mutation
            setLoading(false);
        }
    }, [appConfig]);

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        setSuccessMessage('');
        try {
            await firestoreService.updateAppConfig(config);
            setSuccessMessage("Configuration saved successfully!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            alert("Failed to save configuration.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };
    
    const handleFeatureAccessChange = (key: string, field: 'enabled' | 'minTier', value: boolean | SubscriptionTier) => {
        if (!config) return;
        setConfig(prevConfig => ({
            ...prevConfig!,
            featureAccess: {
                ...prevConfig!.featureAccess,
                [key]: {
                    ...prevConfig!.featureAccess[key],
                    [field]: value
                }
            }
        }));
    };
    
    const handleLimitChange = (tier: 'free' | 'silver', feature: string, value: string) => {
        if (!config) return;
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;
        setConfig(prevConfig => ({
            ...prevConfig!,
            usageLimits: {
                ...prevConfig!.usageLimits,
                [tier]: {
                    ...(prevConfig!.usageLimits[tier] || {}),
                    [feature]: numValue
                }
            }
        }));
    };
    
    const handleCreditCostChange = (feature: string, value: string) => {
         if (!config) return;
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;
        setConfig(prevConfig => ({
            ...prevConfig!,
            usageLimits: {
                ...prevConfig!.usageLimits,
                creditCosts: {
                    ...prevConfig!.usageLimits.creditCosts,
                    [feature]: numValue
                }
            }
        }));
    };
    
    const handleGatewayToggle = (provider: string) => {
        if (!config) return;
        setConfig(prevConfig => ({
            ...prevConfig!,
            paymentSettings: {
                ...prevConfig!.paymentSettings,
                gateways: prevConfig!.paymentSettings.gateways.map(gw => 
                    gw.provider === provider ? { ...gw, enabled: !gw.enabled } : gw
                )
            }
        }));
    };

    if (loading || !config) return <Spinner />;

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Application Configuration</h2>
                <p className="text-gray-600 dark:text-gray-400">Manage all application settings from one place. Changes are saved in real-time and will be reflected for all users.</p>
            </Card>

            {/* Feature Access Management */}
            <Card title="Feature Toggles & Tier Access">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(TOOLS).map(([key, tool]) => (
                        <div key={key} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                            <div className="flex justify-between items-center">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t(tool.nameKey)}</h4>
                                <button
                                    type="button" role="switch" aria-checked={config.featureAccess[key]?.enabled}
                                    onClick={() => handleFeatureAccessChange(key, 'enabled', !config.featureAccess[key]?.enabled)}
                                    className={`${config.featureAccess[key]?.enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                                >
                                    <span className={`${config.featureAccess[key]?.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                </button>
                            </div>
                            <Select
                                label="Minimum Tier"
                                value={config.featureAccess[key]?.minTier || 'free'}
                                onChange={e => handleFeatureAccessChange(key, 'minTier', e.target.value as SubscriptionTier)}
                                className="mt-2"
                            >
                                <option value="free">Free</option>
                                <option value="silver">Silver</option>
                                <option value="gold">Gold</option>
                            </Select>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Usage Limits Management */}
            <Card title="Subscription Limits & Costs">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Free Tier Daily Limits</h4>
                         <div className="space-y-4">
                            {Object.keys(config.usageLimits.free).map(key => (
                                <Input
                                    key={`free-${key}`}
                                    label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    type="number"
                                    id={`limit-free-${key}`}
                                    value={config.usageLimits.free[key as keyof typeof config.usageLimits.free] || 0}
                                    onChange={e => handleLimitChange('free', key, e.target.value)}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Silver Tier Daily Limits</h4>
                         <div className="space-y-4">
                            {Object.keys(config.usageLimits.silver).map(key => (
                                <Input
                                    key={`silver-${key}`}
                                    label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    type="number"
                                    id={`limit-silver-${key}`}
                                    value={config.usageLimits.silver[key as keyof typeof config.usageLimits.silver] || 0}
                                    onChange={e => handleLimitChange('silver', key, e.target.value)}
                                />
                            ))}
                        </div>
                    </div>
                     <div>
                        <h4 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Credit Costs</h4>
                        <div className="space-y-4">
                            {Object.keys(config.usageLimits.creditCosts).map(key => (
                                <Input
                                    key={`credit-${key}`}
                                    label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    type="number"
                                    id={`credit-${key}`}
                                    value={config.usageLimits.creditCosts[key] || 0}
                                    onChange={e => handleCreditCostChange(key, e.target.value)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="AI Model Configuration">
                    <div className="space-y-4">
                        {Object.keys(config.aiModels).map(key => (
                            <Select
                                key={key}
                                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                id={`model-${key}`}
                                value={config.aiModels[key as keyof typeof config.aiModels]}
                                onChange={e => setConfig(c => ({...c!, aiModels: {...c!.aiModels, [key]: e.target.value}}))}
                            >
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                <option value="gemini-2.5-flash-lite">Gemini Flash Lite</option>
                                <option value="gemini-2.5-flash-image">Gemini Flash Image</option>
                                <option value="gemini-2.5-flash-preview-tts">Gemini TTS</option>
                            </Select>
                        ))}
                    </div>
                 </Card>
                 <Card title="Payment Gateway Management">
                    <div className="space-y-4">
                         {config.paymentSettings.gateways.map(gw => (
                            <div key={gw.provider} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{gw.provider}</span>
                                <button
                                    type="button" role="switch" aria-checked={gw.enabled}
                                    onClick={() => handleGatewayToggle(gw.provider)}
                                    className={`${gw.enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}
                                >
                                    <span className={`${gw.enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                </button>
                            </div>
                         ))}
                    </div>
                 </Card>
             </div>

            <div className="flex justify-end items-center pt-4">
                {successMessage && <p className="text-green-500 mr-4">{successMessage}</p>}
                <Button onClick={handleSave} isLoading={saving}>
                    {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
            </div>
        </div>
    );
};

export default AppConfiguration;
