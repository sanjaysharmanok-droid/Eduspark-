import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { getLiveResponse, generateSpeech } from '../../services/geminiService';
import Card from '../common/Card';
import Spinner from '../common/Spinner';
import Button from '../common/Button';
import { Language } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import Select from '../common/Select';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import AdBanner from '../common/AdBanner';

// Add SpeechRecognition to the window interface
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

// --- Audio Decoding Functions (for TTS) ---
// #region Audio Decoding Functions
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
// #endregion


const VisualAssistant: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [spokenText, setSpokenText] = useState('');
    const [responseText, setResponseText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [limitError, setLimitError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const recognitionRef = useRef<any>(null);


    const { t, language: contextLanguage } = useTranslations();
    const { subscriptionTier, canUseFeature, useFeature } = useContext(AppContext);
    const [outputLanguage, setOutputLanguage] = useState<Language>(contextLanguage);

    useEffect(() => {
        setOutputLanguage(contextLanguage);
    }, [contextLanguage]);

    // This effect handles attaching the stream to the video element.
    // It runs when the session becomes active, ensuring the video element
    // is present in the DOM before we try to access it.
    useEffect(() => {
        if (isSessionActive && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isSessionActive]);

    useEffect(() => {
        // Initialize recognition and audio context once
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
        const SpeechRecognitionAPI = webkitSpeechRecognition || SpeechRecognition;
        
        if (!SpeechRecognitionAPI) {
            setError("Speech recognition is not supported by your browser.");
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result) => result.transcript)
                .join('');
            setSpokenText(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setError('Speech recognition failed. Please check microphone permissions.');
            setIsListening(false);
        };

        return () => {
            stopSession();
            audioContextRef.current?.close();
        };
    }, []);
    
    const startSession = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            setIsSessionActive(true);
            setError(null);
            setLimitError(null);
        } catch (err) {
            console.error('Error accessing media devices.', err);
            setError('Could not access camera and microphone. Please grant permissions and try again.');
        }
    };
    
    const stopSession = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsSessionActive(false);
        setResponseText('');
        setSpokenText('');
    };

    const handleHoldToSpeak = () => {
        const recognition = recognitionRef.current;
        if (recognition && !isListening) {
             setSpokenText('');
             setResponseText('');
             setError(null);
             setLimitError(null);
             recognition.start();
        }
    };

    const handleReleaseToStop = () => {
        const recognition = recognitionRef.current;
        if (recognition && isListening) {
            recognition.stop();
        }
    };

    const captureAndAsk = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !spokenText.trim()) return;
        
        if (!canUseFeature('visualAssistant')) {
            setLimitError("You don't have enough credits for this feature (10 required).");
            return;
        }

        setIsLoading(true);
        setResponseText('');
        setError(null);
        setLimitError(null);
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        const imageBase64 = canvas.toDataURL('image/jpeg');

        try {
            const response = await getLiveResponse(spokenText, imageBase64, outputLanguage);
            setResponseText(response);
            if (response) {
                playAudio(response);
            }
            useFeature('visualAssistant');
        } catch (err) {
            console.error("Failed to get live response", err);
            setError("Sorry, I couldn't process that. Please try again.");
        } finally {
            setIsLoading(false);
        }

    }, [spokenText, outputLanguage, canUseFeature, useFeature]);

    const playAudio = async (text: string) => {
        if (!audioContextRef.current) return;
        if (isPlaying) {
            audioSourceRef.current?.stop();
            setIsPlaying(false);
        }
        try {
            const audioData = await generateSpeech(text);
            const audioBuffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsPlaying(false);
            source.start();
            audioSourceRef.current = source;
            setIsPlaying(true);
        } catch (e) {
            console.error("Failed to play audio", e);
        }
    }
    
     useEffect(() => {
        if (!isListening && spokenText.trim()) {
            captureAndAsk();
        }
    }, [isListening, spokenText, captureAndAsk]);


    return (
        <div className="space-y-6">
            {!isSessionActive ? (
                <Card className="text-center">
                    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Start a Visual Session</h3>
                    <p className="mb-6 text-gray-600 dark:text-gray-300">Enable your camera and microphone to ask questions about what you see.</p>
                    <Button onClick={startSession}>Start Session</Button>
                </Card>
            ) : (
                <Card>
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4 border border-gray-300 dark:border-white/20">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"></video>
                        <canvas ref={canvasRef} className="hidden"></canvas>
                        {isListening && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"><div className="w-16 h-16 border-4 border-red-500 rounded-full animate-pulse"></div></div>}
                    </div>
                    
                    <div className="flex flex-col items-center space-y-4">
                        <Select label={t('outputLanguage')} id="output-language" value={outputLanguage} onChange={e => setOutputLanguage(e.target.value as Language)}>
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                        </Select>

                        <button
                            onMouseDown={handleHoldToSpeak}
                            onMouseUp={handleReleaseToStop}
                            onTouchStart={handleHoldToSpeak}
                            onTouchEnd={handleReleaseToStop}
                            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none ring-offset-gray-100 dark:ring-offset-gray-900 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 ${isListening ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/50'}`}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 h-6">{isListening ? 'Listening...' : 'Hold to Speak'}</p>
                        <Button onClick={stopSession} className="bg-gray-600 dark:bg-white/10 hover:bg-gray-700 dark:hover:bg-white/20">End Session</Button>
                    </div>
                </Card>
            )}

            {limitError && <UpgradePrompt message={limitError} />}
            {error && <Card className="bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-200"><p>{error}</p></Card>}
            
            {(subscriptionTier === 'free' || subscriptionTier === 'silver') && isSessionActive && <AdBanner />}

            {(isLoading || responseText || spokenText) && (
                <Card>
                    {spokenText && <p className="text-gray-500 dark:text-gray-400 italic mb-4">You asked: "{spokenText}"</p>}
                    {isLoading && <Spinner />}
                    {responseText && (
                         <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                            {responseText}
                         </div>
                    )}
                </Card>
            )}

        </div>
    );
};

export default VisualAssistant;