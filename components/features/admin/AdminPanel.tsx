import React, { useState } from 'react';
import Card from '../../common/Card';
import Dashboard from './Dashboard';
import UserManagement from './UserManagement';
import AppConfiguration from './AppConfiguration';

const ActivityMonitor = React.lazy(() => import('./ActivityMonitor'));

const AdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'users':
                return <UserManagement />;
            case 'config':
                return <AppConfiguration />;
            case 'activity':
                return <ActivityMonitor />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="border-b border-gray-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        <TabButton name="dashboard" activeTab={activeTab} setActiveTab={setActiveTab}>Dashboard</TabButton>
                        <TabButton name="users" activeTab={activeTab} setActiveTab={setActiveTab}>User Management</TabButton>
                        <TabButton name="config" activeTab={activeTab} setActiveTab={setActiveTab}>App Configuration</TabButton>
                        <TabButton name="activity" activeTab={activeTab} setActiveTab={setActiveTab}>Activity Monitor</TabButton>
                    </nav>
                </div>
            </Card>
            <div className="animate-fade-in-up">
                {renderContent()}
            </div>
        </div>
    );
};

const TabButton: React.FC<{name: string, activeTab: string, setActiveTab: (name: string) => void, children: React.ReactNode}> = ({ name, activeTab, setActiveTab, children }) => {
    const isActive = activeTab === name;
    return (
        <button
            onClick={() => setActiveTab(name)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${isActive 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-indigo-500 hover:border-gray-300 dark:hover:border-slate-600'}`}
        >
            {children}
        </button>
    );
};

export default AdminPanel;