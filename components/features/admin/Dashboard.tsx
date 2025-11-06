import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import * as firestoreService from '../../../services/firestoreService';
import { User, SubscriptionTier } from '../../../types';
import { UserIcon } from '../../icons';

type EditableUser = User & { uid: string; subscription: any; settings: any; createdAt: Date; isAdmin: boolean };

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement }> = ({ title, value, icon }) => (
    <Card className="flex items-center p-4">
        <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </Card>
);

const Dashboard: React.FC = () => {
    const [users, setUsers] = useState<EditableUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const fetchedUsers = await firestoreService.getAllUsers();
                setUsers(fetchedUsers);
            } catch (err) {
                console.error("Failed to fetch users:", err);
                setError("Could not load user data for dashboard.");
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const stats = useMemo(() => {
        if (!users) return { total: 0, free: 0, silver: 0, gold: 0, admins: 0 };
        return {
            total: users.length,
            free: users.filter(u => u.subscription?.tier === 'free').length,
            silver: users.filter(u => u.subscription?.tier === 'silver').length,
            gold: users.filter(u => u.subscription?.tier === 'gold').length,
            admins: users.filter(u => u.isAdmin).length,
        };
    }, [users]);

    if (loading) return <Spinner />;
    if (error) return <Card><p className="text-red-500">{error}</p></Card>;

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">A quick look at your application's stats.</p>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard title="Total Users" value={stats.total} icon={<UserIcon />} />
                <StatCard title="Free Tier" value={stats.free} icon={<UserIcon />} />
                <StatCard title="Silver Tier" value={stats.silver} icon={<UserIcon />} />
                <StatCard title="Gold Tier" value={stats.gold} icon={<UserIcon />} />
                <StatCard title="Admins" value={stats.admins} icon={<UserIcon />} />
            </div>

            <Card title="Recent Activity">
                <p className="text-gray-500 dark:text-gray-400">
                    User activity charts and other detailed analytics will be available here in a future update.
                </p>
            </Card>
        </div>
    );
};

export default Dashboard;
