import React, { useState, useCallback, useEffect, useContext } from 'react';
import { generateSummary } from '../../services/geminiService';
import { Language } from '../../types';
import Button from '../common/Button';
import TextArea from '../common/TextArea';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Select from '../common/Select';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import AdBanner from '../common/AdBanner';
import ResponseWrapper from '../common/ResponseWrapper';

type SummaryStyle = 'bullets' | 'paragraph';

const Summarizer: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [summaryStyle, setSummaryStyle] = useState<SummaryStyle>('bullets');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  
  const { t, language: contextLanguage } = useTranslations();
  const { subscriptionTier, canUseFeature, useFeature } = useContext(AppContext);
  const [outputLanguage, setOutputLanguage] = useState<Language>(contextLanguage);
  
  useEffect(() => {
    setOutputLanguage(contextLanguage)
  }, [contextLanguage]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText) return;

    if (!canUseFeature('summaries')) {
        setLimitError("You've reached your daily limit for summaries.");
        return;
    }

    setLoading(true);
    setError(null);
    setLimitError(null);
    setSummary('');
    try {
      const response = await generateSummary(inputText, summaryStyle, outputLanguage);
      setSummary(response);
      useFeature('summaries');
    } catch (err)      {
      setError('Failed to generate summary. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [inputText, summaryStyle, outputLanguage, canUseFeature, useFeature]);
  
  const getShareText = () => {
      if (!summary) return '';
      return `Summary of the provided text:\n\n${summary}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextArea
            label="Text to Summarize"
            id="text-summarizer"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your text here..."
            rows={8}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Summary Style" id="summary-style" value={summaryStyle} onChange={e => setSummaryStyle(e.target.value as SummaryStyle)}>
              <option value="bullets">Bullet Points</option>
              <option value="paragraph">Paragraph</option>
            </Select>
            <Select label={t('outputLanguage')} id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
            </Select>
          </div>
          <Button type="submit" isLoading={loading}>
            {loading ? 'Summarizing...' : 'Get Summary'}
          </Button>
        </form>
      </Card>

      {limitError && <UpgradePrompt message={limitError} />}
      {error && <Card className="bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200"><p>{error}</p></Card>}
      {loading && <Spinner />}
      
      {(subscriptionTier === 'free' || subscriptionTier === 'silver') && summary && <AdBanner />}

      {summary && (
        <ResponseWrapper title="Summary" onShare={getShareText}>
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
            {summary}
          </div>
        </ResponseWrapper>
      )}
    </div>
  );
};

export default Summarizer;
