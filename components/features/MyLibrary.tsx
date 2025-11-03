import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';
import { LessonList } from '../../types';
import Spinner from '../common/Spinner';
import { getSimpleResponse } from '../../services/geminiService';

const TextExplainer: React.FC = () => {
    const [explanation, setExplanation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [position, setPosition] = useState<{ top: number, left: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const { language } = useContext(AppContext);

    const explainerRef = useRef<HTMLDivElement>(null);

    const handleExplain = async () => {
        if (!selectedText) return;
        setIsLoading(true);
        setError(null);
        setExplanation('');
        try {
            const prompt = `Explain the following term or concept in a simple and concise way: "${selectedText}"`;
            const result = await getSimpleResponse(prompt, language);
            setExplanation(result);
        } catch (err) {
            setError('Could not get an explanation.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        const handleMouseUp = () => {
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            if (text && text.length > 2) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setPosition({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX + rect.width / 2,
                });
                setSelectedText(text);
            } else {
                setSelectedText('');
                setPosition(null);
                setExplanation('');
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (explainerRef.current && !explainerRef.current.contains(event.target as Node)) {
                setSelectedText('');
                setPosition(null);
                setExplanation('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!position || !selectedText) return null;

    return (
        <div 
            ref={explainerRef}
            className="absolute z-30 transform -translate-x-1/2" 
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
            {!explanation && !isLoading && !error && (
                <Button onClick={handleExplain} className="px-3 py-1 text-sm">Explain "{selectedText.substring(0, 15)}..."</Button>
            )}
            {(isLoading || error || explanation) && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-80 border border-gray-200 dark:border-gray-700">
                    {isLoading && <Spinner />}
                    {error && <p className="text-red-500">{error}</p>}
                    {explanation && <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{explanation}</div>}
                </div>
            )}
        </div>
    );
};

const MyLibrary: React.FC = () => {
  const { lessonLists, addLessonList, setActiveQuizTopic, userRole, setActiveTool } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedList, setSelectedList] = useState<LessonList | null>(null);

  const handleCreateList = () => {
    if (newListName.trim()) {
      addLessonList(newListName.trim());
      setNewListName('');
      setIsModalOpen(false);
    }
  };
  
  const handleCreateQuiz = (list: LessonList) => {
    if(userRole !== 'student' || !setActiveTool) return;
    const topic = list.topics.map(t => t.topic).join(', ');
    setActiveQuizTopic(topic);
    setActiveTool('quizGenerator');
  };

  if (selectedList) {
    return (
      <div className="space-y-6">
        <Button onClick={() => setSelectedList(null)}>&larr; Back to All Lists</Button>
        <Card>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">{selectedList.name}</h2>
            <div className="space-y-6">
                {selectedList.topics.length === 0 ? (
                     <p className="text-gray-500 dark:text-gray-400">No topics saved in this list yet.</p>
                ) : (
                    selectedList.topics.map(topic => (
                        <div key={topic.id} className="p-4 border dark:border-gray-700 rounded-lg">
                           <h3 className="text-xl font-semibold mb-2 text-indigo-600 dark:text-indigo-400">{topic.topic}</h3>
                           {topic.imageUrl && <img src={topic.imageUrl} alt={topic.topic} className="rounded-md my-4 max-h-72 w-full object-cover"/>}
                           <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: topic.explanation.replace(/\n/g, '<br />') }}/>
                        </div>
                    ))
                )}
            </div>
        </Card>
        <TextExplainer />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Lesson Lists</h2>
          <Button onClick={() => setIsModalOpen(true)}>Create New List</Button>
        </div>
      </Card>

      {lessonLists.length === 0 ? (
        <Card className="text-center">
          <p className="text-gray-500 dark:text-gray-400">You haven't created any lesson lists yet. Save topics from the Topic Explorer to get started!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lessonLists.map(list => (
            <Card key={list.id}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{list.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{list.topics.length} topic(s)</p>
              <div className="flex space-x-2 mt-4">
                <Button onClick={() => setSelectedList(list)} className="text-sm flex-1">View Topics</Button>
                <Button onClick={() => handleCreateQuiz(list)} disabled={list.topics.length === 0} className="text-sm flex-1 bg-green-600 hover:bg-green-700">Create Quiz</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Lesson List">
        <div className="space-y-4">
          <Input 
            label="List Name"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            placeholder="e.g., Physics Midterm Review"
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button onClick={() => setIsModalOpen(false)} className="bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500">Cancel</Button>
            <Button onClick={handleCreateList}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyLibrary;