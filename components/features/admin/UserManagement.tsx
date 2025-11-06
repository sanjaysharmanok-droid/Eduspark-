import React, { useState, useEffect, useMemo } from 'react';
import * as firestoreService from '../../../services/firestoreService';
import { User, SubscriptionTier, UserRole } from '../../../types';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';
import Input from '../../common/Input';
import Select from '../../common/Select';

type EditableUser = User & { uid: string; subscription: any; settings: any; createdAt: Date; isAdmin: boolean };

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<EditableUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
            setUsers(prevUsers => {
                return prevUsers.map(user => {
                    if (user.uid !== uid) return user;
                    
                    const updatedUser = JSON.parse(JSON.stringify(user));
                    const fieldParts = field.split('.');
                    
                    if (fieldParts.length === 2) {
                        updatedUser[fieldParts[0]][fieldParts[1]] = value;
                    } else {
                        (updatedUser as any)[fieldParts[0]] = value;
                    }
                    return updatedUser;
                });
            });
        } catch (err) {
            alert("Failed to update user. Please check console for errors.");
            console.error(err);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">User Management</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Search, view, and edit user properties directly.</p>
            <Input 
                label="Search Users"
                id="user-search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="mb-4 max-w-sm"
            />
            {loading ? <Spinner /> : error ? <p className="text-red-500">{error}</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Admin</th>
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
                                            value={user.settings.role || ''}
                                            onChange={e => handleUserUpdate(user.uid, 'settings.role', e.target.value as UserRole)}
                                        >
                                            <option value="">Not Set</option>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={user.isAdmin}
                                            onClick={() => handleUserUpdate(user.uid, 'isAdmin', !user.isAdmin)}
                                            className={`${user.isAdmin ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                                            title={user.isAdmin ? 'Revoke Admin' : 'Grant Admin'}
                                        >
                                            <span className={`${user.isAdmin ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                        </button>
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
};

export default UserManagement;
