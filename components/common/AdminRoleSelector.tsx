import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { BookOpenIcon, AcademicCapIcon, ShieldCheckIcon } from '../icons';
import Logo from './Logo';
import Footer from './Footer';

const RoleButton: React.FC<{onClick: () => void, icon: React.ReactElement, title: string, description: string}> = ({ onClick, icon, title, description }) => (
    <button
      onClick={onClick}
      className="group relative p-8 glass-card rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-in-out text-left animate-fade-in-up"
    >
      <div className="flex items-center space-x-6">
        <div className="bg-indigo-100 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 p-4 rounded-xl">
          {icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </button>
);

const AdminRoleSelector: React.FC = () => {
  const { user, selectAdminView } = useContext(AppContext);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden">
      <div className="relative z-10 text-center mb-12 max-w-4xl mx-auto">
        <Logo className="h-20 w-20 mx-auto mb-6 text-indigo-500 dark:text-indigo-400 animate-fade-in-up" />
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight animate-fade-in-up bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400" style={{ animationDelay: '0.1s' }}>
            Welcome, {user?.name}!
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-200 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            You have admin privileges. Please select a view to continue.
        </p>
      </div>
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        <RoleButton
          onClick={() => selectAdminView('student')}
          icon={<BookOpenIcon className="h-10 w-10" />}
          title="Student View"
          description="See the app as a student."
        />
        <RoleButton
          onClick={() => selectAdminView('teacher')}
          icon={<AcademicCapIcon className="h-10 w-10" />}
          title="Teacher View"
          description="See the app as a teacher."
        />
        <RoleButton
          onClick={() => selectAdminView('admin')}
          icon={<ShieldCheckIcon className="h-10 w-10" />}
          title="Admin Dashboard"
          description="Manage users and settings."
        />
      </div>
       <div className="relative z-10 w-full mt-16 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <Footer />
      </div>
    </div>
  );
};

export default AdminRoleSelector;
