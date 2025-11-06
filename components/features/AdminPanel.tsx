import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext';
import * as firestoreService from '../../services/firestoreService';
import { User, SubscriptionTier, UserRole } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import Input from '../common/Input';
import Select from '../common/Select';

type EditableUser = User & { uid: string; subscription: any; settings: any; createdAt: Date };

const AdminPanel: React.FC = () => {
    const { appConfig } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState<EditableUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State for editable config
    const [planPrices, setPlanPrices] = useState({ silver: '', gold: '' });
    const [aiModels, setAiModels] = useState<{[key: string]: string}>({});
    const [configLoading, setConfigLoading] = useState(false);

    useEffect(() => {
        if (appConfig) {
            setPlanPrices(appConfig.planPrices);
            setAiModels(appConfig.aiModels);
        }
    }, [appConfig]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const fetchedUsers = await firestoreService.getAllUsers();
                setUsers(fetchedUsers);
            } catch (err) {
                console.error("Failed to fetch users:", err);
                setError("Could not load user data.");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleUserUpdate = async (uid: string, field: string, value: any) => {
        try {
            await firestoreService.updateUserData(uid, { [field]: value });
            // FIX: Correctly access the nested property to update the local state.
            // The original code was trying to use a string array `field.split('.')` as an object key.
            setUsers(prevUsers => prevUsers.map(u => u.uid === uid ? { ...u, [field.split('.')[0]]: { ...u[field.split('.')[0] as keyof typeof u], [field.split('.')[1]]: value } } : u));
        } catch (err) {
            alert("Failed to update user. Please check console for errors.");
            console.error(err);
        }
    };

    const handleConfigSave = async () => {
        setConfigLoading(true);
        try {
            await firestoreService.updateAppConfig({ planPrices, aiModels });
            alert("Configuration saved successfully! Changes will apply on next app refresh.");
        } catch(err) {
            alert("Failed to save configuration.");
            console.error(err);
        } finally {
            setConfigLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const renderUserManagement = () => (
        <Card>
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">User Management</h3>
            <Input 
                label="Search Users"
                id="user-search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="mb-4"
            />
            {loading ? <Spinner /> : error ? <p className="text-red-500">{error}</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/60 dark:bg-slate-900/60 divide-y divide-gray-200 dark:divide-slate-700">
                            {filteredUsers.map(user => (
                                <tr key={user.uid}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <img className="h-10 w-10 rounded-full" src={user.picture} alt={user.name} />
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Select
                                            label=""
                                            value={user.settings.role}
                                            onChange={e => handleUserUpdate(user.uid, 'settings.role', e.target.value as UserRole)}
                                        >
                                            <option value="student">Student</option>
                                            <option value="teacher">Teacher</option>
                                        </Select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Select
                                            label=""
                                            value={user.subscription.tier}
                                            onChange={e => handleUserUpdate(user.uid, 'subscription.tier', e.target.value as SubscriptionTier)}
                                        >
                                            <option value="free">Free</option>
                                            <option value="silver">Silver</option>
                                            <option value="gold">Gold</option>
                                        </Select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {user.createdAt.toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );

    const renderSettingsManagement = () => (
        <div className="space-y-6">
            <Card>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Plan & Price Management</h3>
                <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 p-4 rounded-r-lg my-4">
                    <p className="font-bold text-yellow-800 dark:text-yellow-200">Important Note</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Changing prices here only updates the display text in the app. To change the actual amount charged, you must update the products in your Stripe and Cashfree dashboards and then update the Price IDs in the serverless function code.
                    </p>
                </div>
                <div className="space-y-4">
                    <Input 
                        label="Silver Plan Display Price"
                        id="silver-price"
                        value={planPrices.silver}
                        onChange={e => setPlanPrices(p => ({ ...p, silver: e.target.value }))}
                        placeholder="e.g., ₹499/mo"
                    />
                    <Input 
                        label="Gold Plan Display Price"
                        id="gold-price"
                        value={planPrices.gold}
                        onChange={e => setPlanPrices(p => ({ ...p, gold: e.target.value }))}
                        placeholder="e.g., ₹999/mo"
                    />
                </div>
            </Card>
            <Card>
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">AI Model Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(aiModels).map(key => (
                        <Select
                            key={key}
                            label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            id={`model-${key}`}
                            value={aiModels[key]}
                            onChange={e => setAiModels(m => ({ ...m, [key]: e.target.value }))}
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
            <div className="flex justify-end">
                <Button onClick={handleConfigSave} isLoading={configLoading}>Save All Settings</Button>
            </div>
        </div>
    );


    return (
        <div className="space-y-6">
            <div className="flex border-b border-gray-200 dark:border-slate-700">
                <TabButton name="users" activeTab={activeTab} setActiveTab={setActiveTab}>User Management</TabButton>
                <TabButton name="settings" activeTab={activeTab} setActiveTab={setActiveTab}>App Settings</TabButton>
            </div>
            <div>
                {activeTab === 'users' && renderUserManagement()}
                {activeTab === 'settings' && renderSettingsManagement()}
            </div>
        </div>
    );
};

const TabButton: React.FC<{name: string, activeTab: string, setActiveTab: (name: string) => void, children: React.ReactNode}> = ({ name, activeTab, setActiveTab, children }) => {
    const isActive = activeTab === name;
    return (
        <button
            onClick={() => setActiveTab(name)}
            className={`-mb-px py-3 px-6 font-semibold border-b-2 transition-colors duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-indigo-500 hover:border-gray-300 dark:hover:border-slate-600'}`}
        >
            {children}
        </button>
    );
};

export default AdminPanel;
