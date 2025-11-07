import React, { useState, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Modal from './Modal';
import Button from './Button';
import { ShieldCheckIcon, BookOpenIcon, AcademicCapIcon } from '../icons';

const AdminControls: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { setAdminViewMode, setUserRole } = useContext(AppContext);

    const handleGoToDashboard = () => {
        setAdminViewMode('admin');
        setIsModalOpen(false);
    };
    
    const handleSwitchRole = () => {
        setUserRole(null); // This triggers the AdminRoleSelector in App.tsx
        setIsModalOpen(false);
    };

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-40 h-16 w-16 bg-gradient-to-r from-slate-700 to-gray-800 rounded-full text-white shadow-lg hover:shadow-2xl hover:shadow-gray-500/50 flex items-center justify-center transform hover:-translate-y-1 transition-all duration-300"
                aria-label="Open Admin Controls"
                title="Admin Controls"
            >
                <ShieldCheckIcon className="w-8 h-8" />
            </button>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Admin Controls">
                <div className="space-y-4 p-4">
                    <p className="text-center text-gray-600 dark:text-gray-300">
                        You are currently viewing the app as a user.
                    </p>
                    <Button onClick={handleGoToDashboard} className="w-full">
                        <ShieldCheckIcon className="w-5 h-5 mr-2" />
                        Go to Admin Dashboard
                    </Button>
                    <Button onClick={handleSwitchRole} className="w-full bg-gray-600 hover:bg-gray-700 from-gray-600 to-gray-700 hover:shadow-gray-500/50">
                        <BookOpenIcon className="w-5 h-5 mr-2" />
                        /
                        <AcademicCapIcon className="w-5 h-5 ml-1 mr-2" />
                        Switch User View
                    </Button>
                </div>
            </Modal>
        </>
    );
};

export default AdminControls;
