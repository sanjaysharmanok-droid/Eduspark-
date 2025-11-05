import React, { useState, useCallback, useEffect, useContext } from 'react';
import { getTopicExplanationWithImage } from '../../services/geminiService';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Select from '../common/Select';
import ResponseWrapper from '../common/ResponseWrapper';
import { Language, ResponseStyle, SavedTopic } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import Modal from '../common/Modal';
import UpgradePrompt from '../common/UpgradePrompt';
import AdBanner from '../common/AdBanner';

const TopicExplorer: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [newListName, setNewListName] = useState('');

  const { t, language: contextLanguage } = useTranslations();
  const { lessonLists, addLessonList, addTopicToLessonList, subscriptionTier, canUseFeature, useFeature } = useContext(AppContext);
  const [outputLanguage, setOutputLanguage] = useState<Language>(contextLanguage);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('Detailed');
  
  useEffect(() => {
    if (lessonLists.length > 0) {
        setSelectedListId(lessonLists[0].id);
    }
  }, [lessonLists]);

  useEffect(() => {
    setOutputLanguage(contextLanguage)
  }, [contextLanguage]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    if (!canUseFeature('topicSearches')) {
        setLimitError("You've reached your daily limit for topic searches.");
        return;
    }

    setLoading(true);
    setError(null);
    setLimitError(null);
    setExplanation('');
    setImageUrl(null);
    try {
      const { explanation: newExplanation, imageUrl: newImageUrl } = await getTopicExplanationWithImage(topic, outputLanguage, responseStyle);
      setExplanation(newExplanation);
      setImageUrl(newImageUrl);
      useFeature('topicSearches');
    } catch (err) {
      setError('Failed to explore the topic. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [topic, outputLanguage, responseStyle, canUseFeature, useFeature]);

  // FIX: handleSaveTopic needs to be async to handle the promise from addLessonList
  const handleSaveTopic = async () => {
    if (!explanation) return;
    let listId = selectedListId;

    if (selectedListId === 'new' && newListName.trim()) {
        const newList = await addLessonList(newListName.trim());
        if (newList) {
            listId = newList.id;
        } else {
            alert("Failed to create a new list.");
            return;
        }
    }

    if (!listId || listId === 'new') {
        alert("Please select a valid list or enter a name for a new list.");
        return;
    }
    
    const newTopic: SavedTopic = {
        id: Date.now().toString(),
        topic,
        explanation,
        imageUrl,
    };

    addTopicToLessonList(listId, newTopic);
    setIsSaveModalOpen(false);
    setNewListName('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="What do you want to learn about?"
            id="topic-explorer"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Photosynthesis, Black Holes, The Roman Empire"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label={t('outputLanguage')} id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
            </Select>
            <Select label={t('responseStyle')} id="response-style" value={responseStyle} onChange={e => setResponseStyle(e.target.value as ResponseStyle)}>
                <option>Simple</option>
                <option>Detailed</option>
                <option>Storytelling</option>
            </Select>
          </div>
          <Button type="submit" isLoading={loading}>
            {loading ? 'Exploring...' : 'Explain Topic'}
          </Button>
        </form>
      </Card>

      {limitError && <UpgradePrompt message={limitError} />}
      {error && <Card className="bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200"><p>{error}</p></Card>}
      {loading && <Spinner />}

      {(subscriptionTier === 'free' || subscriptionTier === 'silver') && explanation && <AdBanner />}

      {explanation && (
        <>
            <div className="text-center">
                <Button onClick={() => setIsSaveModalOpen(true)}>Save Topic to My Library</Button>
            </div>
            <ResponseWrapper title={`About ${topic}`} onShare={() => explanation}>
            {imageUrl && (
                <div className="mb-6 overflow-hidden rounded-lg">
                <img src={imageUrl} alt={`AI-generated image for ${topic}`} className="w-full max-h-96 object-cover shadow-lg" />
                </div>
            )}
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: explanation.replace(/\n/g, '<br />') }} />
            </ResponseWrapper>
        </>
      )}

      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Topic">
         <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">Select a lesson list to save this topic to, or create a new one.</p>
            <Select label="Lesson List" value={selectedListId} onChange={e => setSelectedListId(e.target.value)}>
                {lessonLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                <option value="new">-- Create a New List --</option>
            </Select>
            {selectedListId === 'new' && (
                <Input 
                    label="New List Name"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="e.g., Biology Chapter 5"
                />
            )}
            <div className="flex justify-end space-x-2 pt-4">
                 <Button onClick={() => setIsSaveModalOpen(false)} className="bg-white/10 hover:bg-white/20">Cancel</Button>
                 <Button onClick={handleSaveTopic}>Save</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default TopicExplorer;