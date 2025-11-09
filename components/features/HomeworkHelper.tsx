import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { getSmartResponse, generateSpeech } from '../../services/geminiService';
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
import { ToolKey } from '../../constants';

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const HomeworkHelper: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [useThinkingMode, setUseThinkingMode] = useState(false);
  const [answer, setAnswer] = useState('');
  const [audioContent, setAudioContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { language: contextLanguage } = useTranslations();
  const { subscriptionTier, canUseFeature, useFeature } = useContext(AppContext);
  const [outputLanguage, setOutputLanguage] = useState<Language>(contextLanguage);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  useEffect(() => {
    setOutputLanguage(contextLanguage)
  }, [contextLanguage]);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      audioSourceRef.current?.stop();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
        setImageBase64(null);
    }
  };

  const handlePlayAudio = useCallback(async () => {
    if (!audioContent || !audioContextRef.current) return;

    if (isPlaying) {
      audioSourceRef.current?.stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    try {
      const audioBuffer = await decodeAudioData(decode(audioContent), audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      audioSourceRef.current = source;
    } catch (e) {
      console.error("Failed to play audio", e);
      setError("Could not play the audio response.");
      setIsPlaying(false);
    }
  }, [audioContent, isPlaying]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question && !imageBase64) {
        setError("Please ask a question or upload an image.");
        return;
    };
    
    // Determine which feature is being used based on image upload
    const featureToUse: ToolKey = imageBase64 ? 'visualAssistant' : 'homeworkHelps';

    if (!canUseFeature(featureToUse)) {
        if (featureToUse === 'visualAssistant') {
            setLimitError("You don't have enough credits for an image-based question (10 required).");
        } else {
            setLimitError("You've reached your daily limit for homework help.");
        }
        return;
    }

    setLoading(true);
    setError(null);
    setLimitError(null);
    setAnswer('');
    setAudioContent(null);
    if (isPlaying) {
      audioSourceRef.current?.stop();
      setIsPlaying(false);
    }

    try {
      const prompt = imageBase64 
        ? `Analyze the attached image and answer the following question: "${question}"`
        : `Please answer the following student question clearly and concisely: "${question}"`;
        
      const responseText = await getSmartResponse(prompt, imageBase64, useThinkingMode, outputLanguage);
      setAnswer(responseText);

      if (responseText) {
        const audioData = await generateSpeech(responseText);
        setAudioContent(audioData);
      }
      useFeature(featureToUse); // Deduct credits or increment usage
    } catch (err) {
      setError('Failed to get an answer. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [question, imageBase64, useThinkingMode, isPlaying, outputLanguage, canUseFeature, useFeature]);

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextArea
            label="Your Question"
            id="homework-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Why is the sky blue? Or, describe what's happening in the image."
            rows={5}
          />
          
          <div className="space-y-2">
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload Image (Optional)</label>
             {imageBase64 && (
                <div className="relative group">
                    <img src={imageBase64} alt="Upload preview" className="rounded-lg max-h-48 w-auto" />
                    <button 
                        type="button"
                        onClick={() => setImageBase64(null)}
                        className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
             )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-200 dark:file:bg-white/10 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-gray-300 dark:hover:file:bg-white/20"/>
          </div>
          
          <Select label="Output Language" id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
          </Select>

          <div className="flex items-center justify-between pt-2">
            <Button type="submit" isLoading={loading}>
              {loading ? 'Thinking...' : 'Get Help'}
            </Button>
            <div className="flex items-center">
              <label htmlFor="thinking-mode" className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">Deep Thinking Mode</label>
              <button
                type="button"
                role="switch"
                aria-checked={useThinkingMode}
                onClick={() => setUseThinkingMode(!useThinkingMode)}
                className={`${useThinkingMode ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-black/20'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-indigo-500`}
              >
                <span className={`${useThinkingMode ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
              </button>
            </div>
          </div>
        </form>
      </Card>

      {limitError && <UpgradePrompt message={limitError} />}
      {error && <Card className="bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200"><p>{error}</p></Card>}
      {loading && <Spinner />}

      {(subscriptionTier === 'free' || subscriptionTier === 'silver') && answer && <AdBanner />}

      {answer && (
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Answer</h3>
            {audioContent && (
              <button onClick={handlePlayAudio} disabled={!audioContent} className="flex items-center space-x-2 px-3 py-1.5 border border-transparent text-sm font-medium rounded-full text-indigo-700 bg-indigo-100 dark:text-indigo-200 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isPlaying ? "M10 9v6m4-6v6M3 10v4a2 2 0 002 2h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2zm14 0v4a2 2 0 002 2h2a2 2 0 002-2v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2z" : "M15.552 11.992a.25.25 0 00-.304-.394L9.02 15.106A.25.25 0 009 15.309V8.691a.25.25 0 00-.272-.247l-3 1A.25.25 0 005.5 9.691v4.618a.25.25 0 00.228.247l3 1A.25.25 0 009 15.309v-1.764l5.552-3.553z"}/></svg>
                <span>{isPlaying ? 'Stop' : 'Listen'}</span>
              </button>
            )}
          </div>
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
            {answer}
          </div>
        </Card>
      )}
    </div>
  );
};

export default HomeworkHelper;