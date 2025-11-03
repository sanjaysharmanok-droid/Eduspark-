import React from 'react';

const AdBanner: React.FC = () => {
  return (
    <div className="my-6 p-4 glass-card rounded-lg text-center">
      <p className="text-sm font-medium text-gray-300">Advertisement</p>
      <p className="text-xs text-gray-400">Upgrade to Gold to remove ads!</p>
    </div>
  );
};

export default AdBanner;