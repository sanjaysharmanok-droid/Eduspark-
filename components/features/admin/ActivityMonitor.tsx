import React, { useState, useEffect } from 'react';
import * as firestoreService from '../../../services/firestoreService';
import Card from '../../common/Card';
import Spinner from '../../common/Spinner';

type ActivityLog = { id: string; userId: string; userEmail: string; action: string; details: any; timestamp: { toDate: () => Date } };
type Payment = { id: string; userId: string; userEmail: string; tier: string; amount: number; currency: string; provider: string; transactionId: string; timestamp: { toDate: () => Date } };

const ActivityMonitor: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [activityLogs, paymentHistory] = await Promise.all([
                    firestoreService.getActivityLogs(100),
                    firestoreService.getPayments(100),
                ]);
                setLogs(activityLogs as ActivityLog[]);
                setPayments(paymentHistory as Payment[]);
            } catch (err) {
                console.error(err);
                setError('Failed to load activity data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <Spinner />;
    if (error) return <Card><p className="text-red-500">{error}</p></Card>;

    return (
        <div className="space-y-6">
            <Card title="Recent User Activity">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/60 dark:bg-slate-900/60 divide-y divide-gray-200 dark:divide-slate-700">
                            {logs.map(log => (
                                <tr key={log.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.userEmail}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{log.action}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.details.feature || 'N/A'}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{log.timestamp.toDate().toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Card title="Recent Payments">
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tier</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Provider</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/60 dark:bg-slate-900/60 divide-y divide-gray-200 dark:divide-slate-700">
                             {payments.map(payment => (
                                <tr key={payment.id}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{payment.userEmail}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white capitalize">{payment.tier}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{payment.amount} {payment.currency}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">{payment.provider}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{payment.timestamp.toDate().toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ActivityMonitor;