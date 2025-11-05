import React, { useEffect } from 'react';

// This lets TypeScript know that window.adsbygoogle can exist.
declare global {
    interface Window {
        adsbygoogle?: { [key: string]: unknown }[];
    }
}

const AdBanner: React.FC = () => {
    useEffect(() => {
        try {
            // This is the command to load an ad into the ad unit.
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.error('AdSense failed to load:', err);
        }
    }, []);

    return (
        <div className="my-6 w-full flex justify-center items-center">
            <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', minHeight: '90px' }}
                data-ad-client="ca-pub-9454277921019335"
                data-ad-slot="2310789986"
                data-ad-format="auto"
                data-full-width-responsive="true"
            ></ins>
        </div>
    );
};

export default AdBanner;