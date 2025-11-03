import React, { useRef } from 'react';
import Card from './Card';

interface ResponseWrapperProps {
  children: React.ReactNode;
  title: string;
  onShare: () => string; // Function that returns the text to be shared
}

const ResponseWrapper: React.FC<ResponseWrapperProps> = ({ children, title, onShare }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSaveAsPdf = () => {
    if (contentRef.current) {
      const { jspdf, html2canvas } = window as any;
      if (!jspdf || !html2canvas) {
          alert("PDF generation libraries not found. Please try refreshing the page.");
          console.error("jspdf or html2canvas not loaded on window object");
          return;
      }

      html2canvas(contentRef.current, { backgroundColor: null }).then((canvas: any) => {
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = jspdf;
        const pdf = new jsPDF();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${title.replace(/\s/g, '_')}.pdf`);
      }).catch((error: any) => {
        console.error("Error generating PDF:", error);
        alert("Sorry, there was an error creating the PDF.");
      });
    }
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
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Content copied to clipboard!');
      });
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center space-x-2">
          <button onClick={handleShare} title="Share" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.367a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
          </button>
          <button onClick={handleSaveAsPdf} title="Save as PDF" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
        </div>
      </div>
      <div ref={contentRef}>
        {children}
      </div>
    </Card>
  );
};

export default ResponseWrapper;