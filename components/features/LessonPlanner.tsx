import React, { useState, useCallback, useEffect, useContext } from 'react';
import { generateLessonPlan } from '../../services/geminiService';
import { LessonPlan, Language } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Select from '../common/Select';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import AdBanner from '../common/AdBanner';

const LessonPlanner: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('5th Grade');
  const [duration, setDuration] = useState('45 minutes');
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
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
    if (!topic) {
      setError('Please enter a topic.');
      return;
    }
    
    if (!canUseFeature('lessonPlans')) {
        setLimitError("You've reached your daily limit for lesson plans.");
        return;
    }

    setLoading(true);
    setError(null);
    setLimitError(null);
    setLessonPlan(null);
    try {
      const plan = await generateLessonPlan(topic, grade, duration, outputLanguage);
      setLessonPlan(plan);
      useFeature('lessonPlans');
    } catch (err) {
      setError('Failed to generate lesson plan. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [topic, grade, duration, outputLanguage, canUseFeature, useFeature]);

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Topic"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., The Water Cycle"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Grade Level"
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option>Kindergarten</option>
              <option>1st Grade</option>
              <option>2nd Grade</option>
              <option>3rd Grade</option>
              <option>4th Grade</option>
              <option>5th Grade</option>
              <option>Middle School</option>
              <option>High School</option>
            </Select>
            <Input
              label="Duration"
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 45 minutes"
              required
            />
          </div>
           <Select label={t('outputLanguage')} id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
            </Select>
          <div className="pt-2">
            <Button type="submit" isLoading={loading} className="w-full md:w-auto">
              {loading ? 'Generating...' : 'Generate Lesson Plan'}
            </Button>
          </div>
        </form>
      </Card>

      {limitError && <UpgradePrompt message={limitError} />}
      {error && <Card className="bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200"><p>{error}</p></Card>}
      {loading && <Spinner />}

      {(subscriptionTier === 'free' || subscriptionTier === 'silver') && lessonPlan && <AdBanner />}

      {lessonPlan && (
        <Card>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{lessonPlan.title}</h2>
            <div className="flex flex-wrap gap-4 text-sm">
                <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-500/50 dark:text-indigo-200 px-3 py-1 rounded-full font-medium">{lessonPlan.gradeLevel}</span>
                <span className="bg-green-100 text-green-800 dark:bg-green-500/50 dark:text-green-200 px-3 py-1 rounded-full font-medium">{lessonPlan.duration}</span>
            </div>

            <div className="prose dark:prose-invert max-w-none">
                <h3>Learning Objectives</h3>
                <ul className="list-disc pl-5 space-y-1">
                    {lessonPlan.learningObjectives.map((obj, i) => <li key={i}>{obj}</li>)}
                </ul>

                <h3>Materials</h3>
                <ul className="list-disc pl-5 space-y-1">
                    {lessonPlan.materials.map((mat, i) => <li key={i}>{mat}</li>)}
                </ul>

                <h3>Activities</h3>
                {lessonPlan.activities.map((act, i) => (
                    <div key={i} className="mt-2 p-4 border-l-4 border-indigo-500 bg-gray-50 dark:bg-black/20 rounded-r-lg">
                        <h4 className="font-bold">{act.title} ({act.duration} mins)</h4>
                        <p className="mt-1">{act.description}</p>
                    </div>
                ))}

                <h3>Assessment</h3>
                <p>{lessonPlan.assessment}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LessonPlanner;