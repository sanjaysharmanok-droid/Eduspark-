import React, { useState, useCallback, useEffect, useContext } from 'react';
import { getDetailedFactsResponse } from '../../services/geminiService';
import { Language, Fact, SavedTopic } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Select from '../common/Select';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import ResponseWrapper from '../common/ResponseWrapper';
import Modal from '../common/Modal';

const FactFinder: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [numFacts, setNumFacts] = useState('5');
  const [result, setResult] = useState<{ topic: string; facts: Fact[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t, language: contextLanguage } = useTranslations();
  const { addLessonList, addTopicToLessonList, lessonLists } = useContext(AppContext);
  const [outputLanguage, setOutputLanguage] = useState<Language>(contextLanguage);
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    setOutputLanguage(contextLanguage);
  }, [contextLanguage]);

  useEffect(() => {
    if (lessonLists.length > 0 && !selectedListId) {
        setSelectedListId(lessonLists[0].id);
    }
  }, [lessonLists, selectedListId]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const factsCount = parseInt(numFacts, 10);
    if (!topic || isNaN(factsCount) || factsCount < 1) {
      setError('Please enter a valid topic and number of facts.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await getDetailedFactsResponse(topic, factsCount, outputLanguage);
      setResult(response);
    } catch (err) {
      setError('Failed to find facts. The model might be busy. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [topic, numFacts, outputLanguage]);

  const handleSaveFacts = async () => {
    if (!result) return;
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
    
    const explanationText = result.facts
      .map(f => `<h3>${f.fact}</h3><p>${f.detail}</p>`)
      .join('<br/><br/>');
    
    const newTopic: SavedTopic = {
        id: Date.now().toString(),
        topic: `Facts about ${result.topic}`,
        explanation: explanationText,
        imageUrl: null, // No image for facts compilation
    };

    addTopicToLessonList(listId, newTopic);
    setIsSaveModalOpen(false);
    setNewListName('');
  };

  const getShareText = () => {
      if (!result) return '';
      return `Here are some interesting facts about ${result.topic}:\n\n` + 
             result.facts.map(f => `*${f.fact}*\n${f.detail}`).join('\n\n');
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="What do you want facts about?"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., The Moon, Ancient Egypt, Honeybees"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                  label="Number of Facts"
                  id="num-facts"
                  type="number"
                  value={numFacts}
                  onChange={(e) => setNumFacts(e.target.value)}
                  onBlur={() => {
                      const num = parseInt(numFacts, 10);
                      if (isNaN(num) || num < 1) {
                          setNumFacts('1');
                      } else if (num > 10) {
                          setNumFacts('10');
                      }
                  }}
                  min="1"
                  max="10"
                  required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Maximum 10 facts.</p>
            </div>
            <Select label={t('outputLanguage')} id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
            </Select>
          </div>
          <div className="pt-2">
            <Button type="submit" isLoading={loading} className="w-full md:w-auto">
              {loading ? 'Searching...' : 'Find Facts'}
            </Button>
          </div>
        </form>
      </Card>

      {error && <Card className="bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200"><p>{error}</p></Card>}
      {loading && <Spinner />}

      {result && (
        <>
            <div className="text-center">
                <Button onClick={() => setIsSaveModalOpen(true)}>Save Facts to My Library</Button>
            </div>
            <ResponseWrapper title={`Facts about ${result.topic}`} onShare={getShareText}>
                <div className="space-y-6">
                    {result.facts.map((item, index) => (
                        <div key={index} className="p-4 border-l-4 border-indigo-500 bg-gray-50 dark:bg-black/20 rounded-r-lg">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{item.fact}</h3>
                            <p className="text-gray-700 dark:text-gray-300">{item.detail}</p>
                        </div>
                    ))}
                </div>
            </ResponseWrapper>
        </>
      )}

      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Facts to a Lesson List">
         <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">Select a list to save these facts to, or create a new one.</p>
            <Select label="Lesson List" value={selectedListId} onChange={e => setSelectedListId(e.target.value)}>
                {lessonLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                <option value="new">-- Create a New List --</option>
            </Select>
            {selectedListId === 'new' && (
                <Input 
                    label="New List Name"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="e.g., Fun Science Facts"
                />
            )}
            <div className="flex justify-end space-x-2 pt-4">
                 <Button onClick={() => setIsSaveModalOpen(false)} className="bg-white/10 hover:bg-white/20">Cancel</Button>
                 <Button onClick={handleSaveFacts}>Save</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default FactFinder;