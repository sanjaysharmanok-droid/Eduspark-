import React, { useState, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { QuizAttempt, QuizQuestion } from '../../types';

const MyReports: React.FC = () => {
    const { quizAttempts } = useContext(AppContext);
    const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);

    const getResultClassName = (question: QuizQuestion, option: string, userAnswer: string | null) => {
        const isCorrect = option === question.correctAnswer;
        const isSelected = option === userAnswer;

        if (isCorrect) return 'font-bold text-green-700 dark:text-green-400';
        if (isSelected && !isCorrect) return 'font-bold text-red-700 dark:text-red-400 line-through';
        return 'text-gray-700 dark:text-gray-300';
    };

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Quiz Reports</h2>
            </Card>

            {quizAttempts.length === 0 ? (
                <Card className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">You haven't completed any quizzes yet. Generate a quiz and submit it to see your report here!</p>
                </Card>
            ) : (
                quizAttempts.map(attempt => (
                    <Card key={attempt.id}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{attempt.quiz.topic}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Completed on: {new Date(attempt.date).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                    Score: {attempt.score.toFixed(0)}%
                                </p>
                                <Button onClick={() => setSelectedAttempt(attempt)} className="text-sm px-4 py-2">
                                    View Details
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))
            )}

            {selectedAttempt && (
                <Modal 
                    isOpen={!!selectedAttempt} 
                    onClose={() => setSelectedAttempt(null)} 
                    title={`Report: ${selectedAttempt.quiz.topic}`}
                >
                    <div className="space-y-6">
                        {selectedAttempt.quiz.questions.map((q, index) => (
                             <div key={index} className="p-4 border-b dark:border-gray-700">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{index + 1}. {q.question}</p>
                                <div className="mt-3 space-y-2">
                                {q.options.map((option, i) => (
                                    <div key={i} className="flex items-start">
                                        <span className={`mr-2 ${getResultClassName(q, option, selectedAttempt.userAnswers[index])}`}>
                                            {option === selectedAttempt.userAnswers[index] ? '●' : '○'}
                                        </span>
                                        <span className={getResultClassName(q, option, selectedAttempt.userAnswers[index])}>
                                            {option}
                                        </span>
                                    </div>
                                ))}
                                </div>
                                {selectedAttempt.userAnswers[index] !== q.correctAnswer && (
                                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">Correct answer: {q.correctAnswer}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default MyReports;
