import React, { useState, useCallback, useEffect, useContext } from 'react';
import { getSimpleResponse } from '../../services/geminiService';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Select from '../common/Select';
import { Language } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import AdBanner from '../common/AdBanner';

const ActivityGenerator: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [ideas, setIdeas] = useState('');
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
    if (!subject) return;

    if (!canUseFeature('activities')) {
        setLimitError("You've reached your daily limit for activity generations.");
        return;
    }

    setLoading(true);
    setError(null);
    setLimitError(null);
    setIdeas('');
    try {
      const prompt = `Generate 5 creative and engaging classroom activity ideas for the subject of "${subject}". For each idea, provide a brief description. Format the response with clear headings for each idea.`;
      const response = await getSimpleResponse(prompt, outputLanguage);
      setIdeas(response);
      useFeature('activities');
    } catch (err)      {
      setError('Failed to generate ideas. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [subject, outputLanguage, canUseFeature, useFeature]);

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject or Topic"
            id="activity-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Fractions, Shakespeare, The Solar System"
            required
          />
           <Select label={t('outputLanguage')} id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
          </Select>
          <Button type="submit" isLoading={loading}>
            {loading ? 'Generating...' : 'Get Ideas'}
          </Button>
        </form>
      </Card>

      {limitError && <UpgradePrompt message={limitError} />}
      {error && <Card className="bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200"><p>{error}</p></Card>}
      {loading && <Spinner />}
      
      {(subscriptionTier === 'free' || subscriptionTier === 'silver') && ideas && <AdBanner />}

      {ideas && (
        <Card title="Activity Ideas">
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
            {ideas}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ActivityGenerator;