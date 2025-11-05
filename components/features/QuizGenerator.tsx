import React, { useState, useCallback, useEffect, useContext, useRef } from 'react';
import { generateQuiz } from '../../services/geminiService';
import { Quiz, Language, QuizQuestion } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import AdBanner from '../common/AdBanner';
import TextArea from '../common/TextArea';

const QuizGenerator: React.FC = () => {
  const { addQuizAttempt, userRole, activeQuizTopic, setActiveQuizTopic, subscriptionTier, canUseFeature, useFeature, usage } = useContext(AppContext);

  const [topic, setTopic] = useState(activeQuizTopic || '');
  const [numQuestions, setNumQuestions] = useState('5');
  const [difficulty, setDifficulty] = useState('Medium');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  
  // State for solving quiz
  const [isSolving, setIsSolving] = useState(false);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const quizContentRef = useRef<HTMLDivElement>(null);

  const { t, language: contextLanguage } = useTranslations();
  const [outputLanguage, setOutputLanguage] = useState<Language>(contextLanguage);

  const isPaidUser = subscriptionTier === 'silver' || subscriptionTier === 'gold';
  const isTeacher = userRole === 'teacher';
  const isTeacherPaid = isTeacher && isPaidUser;

  const maxQuestions = isTeacherPaid ? 100 : 50;

  useEffect(() => {
    setOutputLanguage(contextLanguage)
  }, [contextLanguage]);

  useEffect(() => {
    // Reset topic when component unmounts or activeQuizTopic changes
    return () => {
      setActiveQuizTopic(null);
    };
  }, [setActiveQuizTopic]);

  const resetState = () => {
    setQuiz(null);
    setIsSolving(false);
    setUserAnswers([]);
    setShowResults(false);
    setScore(0);
    setTopic(activeQuizTopic || '');
    setError(null);
    setLimitError(null);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const questionsCount = parseInt(numQuestions, 10);
    if (!topic || isNaN(questionsCount) || questionsCount < 1) {
        setError("Please enter a valid topic and number of questions.");
        return;
    }

    if (isTeacher && !isPaidUser && (difficulty === 'Mix' || topic.includes(','))) {
        setLimitError("Using multiple topics and 'Mix' difficulty is a premium feature.");
        return;
    }

    if (!canUseFeature('quizQuestions', questionsCount)) {
        setLimitError(`You can generate ${100 - (usage.quizQuestions)} more questions today.`);
        return;
    }

    resetState();
    setLoading(true);
    setError(null);
    try {
      const generatedQuiz = await generateQuiz(topic, questionsCount, difficulty, outputLanguage);
      setQuiz(generatedQuiz);
      if (userRole === 'student') {
        setUserAnswers(new Array(generatedQuiz.questions.length).fill(null));
        setIsSolving(true);
      }
      useFeature('quizQuestions', questionsCount);
    } catch (err) {
      setError('Failed to generate quiz. The model may have returned an unexpected format. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [topic, numQuestions, difficulty, outputLanguage, userRole, canUseFeature, useFeature, isTeacher, isPaidUser, usage.quizQuestions]);
  
  const handleAnswerChange = (questionIndex: number, answer: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = answer;
    setUserAnswers(newAnswers);
  };

  const handleSubmitQuiz = () => {
    if (!quiz) return;
    let correctCount = 0;
    quiz.questions.forEach((q, index) => {
      if (userAnswers[index] === q.correctAnswer) {
        correctCount++;
      }
    });
    const calculatedScore = (correctCount / quiz.questions.length) * 100;
    setScore(calculatedScore);
    setShowResults(true);
    addQuizAttempt({ quiz, userAnswers, score: calculatedScore });
  };
  
  const handleDownloadPdf = () => {
    const input = quizContentRef.current;
    if (!input || !quiz) {
        setError("Could not find quiz content to download.");
        return;
    };

    const { jspdf, html2canvas } = window as any;
    if (!jspdf || !html2canvas) {
        setError("PDF generation libraries not found. Please try refreshing the page.");
        return;
    }
    
    html2canvas(input, { scale: 2, backgroundColor: null })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const { jsPDF } = jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / pdfWidth;
        const imgHeight = canvasHeight / ratio;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        if (subscriptionTier === 'free') {
            const totalPages = pdf.internal.getNumberOfPages();
            const watermarkText = "💡 EduSpark AI";
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(50);
                pdf.setTextColor(100, 100, 100);
                pdf.saveGraphicsState();
                if (jspdf.GState) {
                    pdf.setGState(new jspdf.GState({ opacity: 0.1 }));
                }
                const x = pdf.internal.pageSize.getWidth() / 2;
                const y = pdf.internal.pageSize.getHeight() / 2;
                pdf.text(watermarkText, x, y, { angle: -45, align: 'center' });
                pdf.restoreGraphicsState();
            }
        }

        pdf.save(`quiz_${quiz.topic.replace(/\s/g, '_')}.pdf`);
      }).catch((err: any) => {
          console.error("Error generating PDF", err);
          setError("Failed to generate PDF. Please try again.");
      });
  };
  
  const getResultClassName = (question: QuizQuestion, option: string, userAnswer: string | null) => {
    if (option === question.correctAnswer) {
      return 'font-bold text-green-700 dark:text-green-400';
    }
    if (option === userAnswer && option !== question.correctAnswer) {
      return 'font-bold text-red-700 dark:text-red-400 line-through';
    }
    return '';
  };

  const renderQuizForSolving = () => (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quiz: {quiz?.topic}</h3>
        <Button onClick={handleDownloadPdf} className="text-sm px-4 py-2 bg-gray-600 dark:bg-white/10 hover:bg-gray-700 dark:hover:bg-white/20">Download PDF</Button>
      </div>
      <div ref={quizContentRef}>
        <div className="space-y-6">
            {quiz?.questions.map((q, index) => (
            <div key={index} className="p-4 bg-gray-100 dark:bg-black/20 rounded-lg">
                <p className="font-semibold text-gray-800 dark:text-gray-100">{index + 1}. {q.question}</p>
                <div className="mt-3 space-y-2">
                {q.options.map((option, i) => (
                    <label key={i} className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="radio"
                        name={`question-${index}`}
                        value={option}
                        checked={userAnswers[index] === option}
                        onChange={() => handleAnswerChange(index, option)}
                        disabled={showResults}
                        className="h-4 w-4 text-indigo-600 border-gray-400 dark:border-gray-500 bg-transparent focus:ring-indigo-500 disabled:opacity-70"
                    />
                    <span className={`text-gray-700 dark:text-gray-300 ${showResults && getResultClassName(q, option, userAnswers[index])}`}>
                        {option}
                    </span>
                    </label>
                ))}
                </div>
                {showResults && userAnswers[index] !== q.correctAnswer && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400">Correct answer: {q.correctAnswer}</p>
                )}
            </div>
            ))}
        </div>
      </div>
      {!showResults && (
        <Button onClick={handleSubmitQuiz} className="w-full mt-6">Submit Quiz</Button>
      )}
    </Card>
  );

  const renderQuizForViewing = () => (
    <Card>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quiz: {quiz?.topic}</h3>
            <Button onClick={handleDownloadPdf} className="text-sm px-4 py-2 bg-gray-600 dark:bg-white/10 hover:bg-gray-700 dark:hover:bg-white/20">Download PDF</Button>
        </div>
        <div ref={quizContentRef}>
            <div className="space-y-4">
                {quiz?.questions.map((q, index) => (
                    <div key={index} className="p-4 bg-gray-100 dark:bg-black/20 rounded-lg">
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{index + 1}. {q.question}</p>
                        <ul className="list-disc pl-8 mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                            {q.options.map((opt, i) => <li key={i}>{opt}</li>)}
                        </ul>
                        <p className="text-green-600 dark:text-green-400 font-medium mt-2">Correct Answer: {q.correctAnswer}</p>
                    </div>
                ))}
            </div>
        </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {!isSolving && !showResults && (
        <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
            {isTeacherPaid ? (
                <TextArea
                    label="Quiz Topic(s)"
                    id="quiz-topic-teacher"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., World War II, The Cold War, Vietnam War"
                    required
                    rows={3}
                    aria-describedby='topic-help'
                />
            ) : (
                <Input
                    label="Quiz Topic"
                    id="quiz-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., World War II"
                    required
                />
            )}
            {isTeacher && (
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2" id="topic-help">
                    {isPaidUser ? "You can enter multiple topics separated by commas." : "Upgrade to premium to use multiple topics."}
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Number of Questions"
                    id="num-questions"
                    type="number"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(e.target.value)}
                    onBlur={() => {
                        const num = parseInt(numQuestions, 10);
                        if (isNaN(num) || num < 1) {
                            setNumQuestions('1');
                        } else if (num > maxQuestions) {
                            setNumQuestions(String(maxQuestions));
                        }
                    }}
                    min="1"
                    max={maxQuestions}
                    required
                />
                <div className="relative">
                    <Select
                        label="Difficulty"
                        id="difficulty"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                    >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                        {isTeacher && <option value="Mix" disabled={!isPaidUser}>Mix</option>}
                    </Select>
                    {isTeacher && !isPaidUser && 
                        <span className="absolute top-8 right-8 text-yellow-500 dark:text-yellow-400" title="Premium Feature">🔒</span>
                    }
                </div>
            </div>
            <Select label={t('outputLanguage')} id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                </Select>
            <Button type="submit" isLoading={loading}>
                {loading ? 'Generating...' : 'Generate Quiz'}
            </Button>
            </form>
        </Card>
      )}

      {limitError && <UpgradePrompt message={limitError} />}
      {error && <Card className="bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200"><p>{error}</p></Card>}
      {loading && <Spinner />}
      
      {(subscriptionTier === 'free' || subscriptionTier === 'silver') && (quiz || showResults) && <AdBanner />}

      {quiz && userRole === 'teacher' && renderQuizForViewing()}
      {quiz && userRole === 'student' && (isSolving || showResults) && renderQuizForSolving()}

      {showResults && (
        <Card title="Quiz Results">
            <div className="text-center">
                <p className="text-lg text-gray-600 dark:text-gray-300">You scored:</p>
                <p className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500 dark:from-purple-400 dark:to-indigo-400 my-2">{score.toFixed(0)}%</p>
                <Button onClick={resetState} className="mt-4">Create Another Quiz</Button>
            </div>
        </Card>
      )}
    </div>
  );
};

export default QuizGenerator;