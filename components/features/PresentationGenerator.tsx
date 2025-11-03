import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { generateVisualPresentation } from '../../services/geminiService';
import { Presentation, PresentationTheme, Language } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Select from '../common/Select';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import AdBanner from '../common/AdBanner';

const PresentationGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(8);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [theme, setTheme] = useState<PresentationTheme>('Professional');
  
  const { t, language: contextLanguage } = useTranslations();
  const { subscriptionTier, canUseFeature, useFeature } = useContext(AppContext);
  const [outputLanguage, setOutputLanguage] = useState<Language>(contextLanguage);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setOutputLanguage(contextLanguage)
  }, [contextLanguage]);

  useEffect(() => {
    if (presentation) {
        slideRefs.current = slideRefs.current.slice(0, presentation.slides.length);
    }
  }, [presentation]);

  const handleDownloadPdf = async () => {
    if (!presentation || slideRefs.current.length === 0) return;

    const { jspdf, html2canvas } = window as any;
    if (!jspdf || !html2canvas) {
        setError("PDF generation libraries not found. Please try refreshing the page.");
        console.error("jspdf or html2canvas not loaded on window object");
        return;
    }
    
    setLoading(true);
    const { jsPDF } = jspdf;
    const pdf = new jsPDF('landscape', 'px', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < presentation.slides.length; i++) {
        const slideElement = slideRefs.current[i];
        if (slideElement) {
            try {
                const canvas = await html2canvas(slideElement, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);

                if (subscriptionTier === 'free') {
                    pdf.setFontSize(50);
                    pdf.setTextColor(220, 220, 220); // Very light grey
                    pdf.saveGraphicsState();
                    if (jspdf.GState) {
                        pdf.setGState(new jspdf.GState({ opacity: 0.4 }));
                    }
                    const x = pdf.internal.pageSize.getWidth() / 2;
                    const y = pdf.internal.pageSize.getHeight() / 2;
                    pdf.text("💡 EduSpark AI", x, y, { angle: 30, align: 'center' });
                    pdf.restoreGraphicsState();
                }

            } catch (e) {
                console.error(`Error generating canvas for slide ${i+1}:`, e);
                setError(`Error processing slide ${i + 1}. The PDF may be incomplete.`);
            }
        }
    }
    pdf.save(`${topic.replace(/\s/g, '_')}_presentation.pdf`);
    setLoading(false);
  };


  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;
    
    if (!canUseFeature('presentations')) {
        setLimitError("You've reached your daily limit for presentations.");
        return;
    }

    setLoading(true);
    setError(null);
    setLimitError(null);
    setPresentation(null);
    try {
      const result = await generateVisualPresentation(topic, numSlides, theme, outputLanguage);
      setPresentation(result);
      useFeature('presentations');
    } catch (err) {
      setError('Failed to generate presentation. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [topic, numSlides, theme, outputLanguage, canUseFeature, useFeature]);

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Presentation Topic"
            id="presentation-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., The Future of Renewable Energy"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Approximate Number of Slides"
              id="num-slides"
              type="number"
              value={numSlides}
              onChange={(e) => setNumSlides(Math.max(3, parseInt(e.target.value, 10)))}
              min="3"
              max="15"
              required
            />
             <Select label="Presentation Theme" id="presentation-theme" value={theme} onChange={e => setTheme(e.target.value as PresentationTheme)}>
                <option>Professional</option>
                <option>Creative</option>
                <option>Minimalist</option>
            </Select>
          </div>
           <Select label={t('outputLanguage')} id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
            </Select>
          <Button type="submit" isLoading={loading}>
            {loading ? 'Generating...' : 'Generate Presentation'}
          </Button>
        </form>
      </Card>

      {limitError && <UpgradePrompt message={limitError} />}
      {error && <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200"><p>{error}</p></Card>}
      {loading && <Spinner />}

      {(subscriptionTier === 'free' || subscriptionTier === 'silver') && presentation && <AdBanner />}

      {presentation && (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{presentation.topic}</h2>
             <Button onClick={handleDownloadPdf} isLoading={loading}>
                {loading ? 'Downloading...' : 'Download as PDF'}
            </Button>
          </div>
          <div className="space-y-8">
            {presentation.slides.map((slide, index) => (
              <div key={index} ref={el => { slideRefs.current[index] = el; }} className="aspect-video w-full bg-gray-700 rounded-lg shadow-lg flex flex-col justify-center items-center p-8 text-white overflow-hidden relative">
                 {slide.imageUrl && <img src={slide.imageUrl} alt={`Background for ${slide.title}`} className="absolute top-0 left-0 w-full h-full object-cover z-0" />}
                 <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 z-10"></div>
                 <div className="relative z-20 text-center w-full">
                    <h3 className="text-4xl font-bold mb-4 drop-shadow-lg">{slide.title}</h3>
                    <ul className="space-y-2">
                        {slide.content.map((point, i) => <li key={i} className="text-xl drop-shadow-md">{point}</li>)}
                    </ul>
                 </div>
                 <div className="absolute bottom-4 right-4 z-20 text-xs text-white/50">{index + 1}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PresentationGenerator;