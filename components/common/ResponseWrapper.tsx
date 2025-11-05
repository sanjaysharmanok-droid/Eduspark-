import React, { useRef, useContext, useState, useEffect } from 'react';
import Card from './Card';
import { AppContext } from '../../contexts/AppContext';
import Modal from './Modal';
import Button from './Button';
import Spinner from './Spinner';

interface ResponseWrapperProps {
  children: React.ReactNode;
  title: string;
  onShare: () => string; // Function that returns the text to be shared
}

declare global {
    interface Window {
        adsbygoogle?: { [key: string]: unknown }[];
    }
}

const RewardedAd: React.FC = () => {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
            console.error('AdSense failed to load in modal:', err);
        }
    }, []);

    // NOTE: Using a consistent, known-working web ad unit ID from AdBanner.tsx
    // to prevent errors from misconfigured or incorrect ad types (e.g., AdMob vs AdSense).
    return (
        <div className="my-4 w-full flex justify-center items-center bg-gray-200 dark:bg-slate-800 min-h-[250px]">
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-9454277921019335" // Publisher ID
                data-ad-slot="2310789986" // Correct web ad unit slot
                data-ad-format="auto"
                data-full-width-responsive="true"
            ></ins>
        </div>
    );
};


const ResponseWrapper: React.FC<ResponseWrapperProps> = ({ children, title, onShare }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { subscriptionTier } = useContext(AppContext);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let timer: number;
    if (isAdModalOpen && countdown > 0) {
      timer = window.setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isAdModalOpen, countdown]);

  const handleSaveAsPdf = () => {
    if (contentRef.current) {
      const { jspdf, html2canvas } = window as any;
      if (!jspdf || !html2canvas) {
          alert("PDF generation libraries not found. Please try refreshing the page.");
          return;
      }

      setIsDownloading(true);
      html2canvas(contentRef.current, { 
          backgroundColor: window.getComputedStyle(document.body).getPropertyValue('background-color'), 
          scale: 2 
      }).then((canvas: any) => {
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const { jsPDF } = jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`${title.replace(/\s/g, '_')}.pdf`);
      }).catch((error: any) => {
        console.error("Error generating PDF:", error);
        alert("Sorry, there was an error creating the PDF.");
      }).finally(() => {
        setIsDownloading(false);
      });
    }
  };
  
  const handleDownloadClick = () => {
    if (subscriptionTier !== 'free') {
      handleSaveAsPdf();
    } else {
      setCountdown(15);
      setIsAdModalOpen(true);
    }
  };

  const handleRewardedDownload = () => {
    handleSaveAsPdf();
    setIsAdModalOpen(false);
  };

  const handleShare = async () => {
    const shareText = onShare();
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Content copied to clipboard!');
      });
    }
  };

  return (
    <>
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center space-x-2">
          <button onClick={handleShare} title="Share" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.367a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
          </button>
          <button onClick={handleDownloadClick} disabled={isDownloading} title="Download as PDF" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50">
            {isDownloading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
          </button>
        </div>
      </div>
      <div ref={contentRef} className="response-content-pdf">
        {children}
      </div>
    </Card>
    <Modal isOpen={isAdModalOpen} onClose={() => setIsAdModalOpen(false)} title="Unlock Your Download">
        <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-2">As a free user, please view this ad to start your download.</p>
            <RewardedAd />
            {countdown > 0 ? (
                <div className="space-y-2">
                    <Spinner />
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Your download will be ready in {countdown} seconds...</p>
                </div>
            ) : (
                <Button onClick={handleRewardedDownload} className="w-full">
                    Download Now
                </Button>
            )}
        </div>
    </Modal>
    </>
  );
};

export default ResponseWrapper;