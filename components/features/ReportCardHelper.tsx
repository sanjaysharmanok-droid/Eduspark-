import React, { useState, useCallback, useEffect, useContext } from 'react';
import { getSimpleResponse } from '../../services/geminiService';
import Button from '../common/Button';
import TextArea from '../common/TextArea';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Select from '../common/Select';
import { Language } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import AdBanner from '../common/AdBanner';

const ReportCardHelper: React.FC = () => {
  const [studentInfo, setStudentInfo] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t, language: contextLanguage } = useTranslations();
  const { subscriptionTier } = useContext(AppContext);
  const [outputLanguage, setOutputLanguage] = useState<Language>(contextLanguage);
  
  useEffect(() => {
    setOutputLanguage(contextLanguage)
  }, [contextLanguage]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInfo) return;
    setLoading(true);
    setError(null);
    setComments('');
    try {
      const prompt = `Based on the following notes about a student, generate 3 different, constructive, and encouraging report card comments.
      
      Student Notes: "${studentInfo}"

      Format the response with a clear heading for each comment variation.`;
      const response = await getSimpleResponse(prompt, outputLanguage);
      setComments(response);
    } catch (err) {
      setError('Failed to generate comments. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [studentInfo, outputLanguage]);

  if (subscriptionTier === 'free') {
    return (
        <UpgradePrompt message="The Report Card Helper is a premium feature. Upgrade to generate comments." />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextArea
            label="Student Notes"
            id="student-info"
            value={studentInfo}
            onChange={(e) => setStudentInfo(e.target.value)}
            placeholder="e.g., Strengths: great at math, participates in class. Areas for improvement: needs to focus on reading comprehension, sometimes talks during quiet work."
            rows={6}
            required
          />
           <Select label={t('outputLanguage')} id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
          </Select>
          <Button type="submit" isLoading={loading}>
            {loading ? 'Generating...' : 'Generate Comments'}
          </Button>
        </form>
      </Card>

      {error && <Card className="bg-red-900/50 border-red-500/50 text-red-200"><p>{error}</p></Card>}
      {loading && <Spinner />}

      {subscriptionTier === 'silver' && comments && <AdBanner />}

      {comments && (
        <Card title="Suggested Comments">
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
            {comments}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReportCardHelper;