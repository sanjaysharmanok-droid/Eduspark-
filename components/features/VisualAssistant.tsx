import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Language } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import { ToolKey } from '../../constants';
import { SwitchCameraIcon, UserIcon, MicrophoneIcon } from '../icons';
import Button from '../common/Button';
import Logo from '../common/Logo';

// #region Helper Functions
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}
const blobToBase64 = (blob: globalThis.Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
// #endregion

type Transcript = { id: number; role: 'user' | 'model'; text: string; isFinal: boolean };
type SessionState = 'idle' | 'starting' | 'active' | 'ending';
type AiStatus = 'listening' | 'thinking' | 'speaking';

const VisualAssistant: React.FC = () => {
    const { canUseFeature, useFeature, setActiveTool, userRole } = useContext(AppContext);
    const { language } = useTranslations();
    const defaultTool = userRole === 'teacher' ? 'lessonPlanner' : 'homeworkHelper';

    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [limitError, setLimitError] = useState<string | null>(null);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    useEffect(() => {
        // This effect runs when the session becomes active and ensures the video stream is attached.
        if (sessionState === 'active' && streamRef.current && videoRef.current) {
            // Check if the stream is already set to avoid unnecessary re-assignments
            if (videoRef.current.srcObject !== streamRef.current) {
                videoRef.current.srcObject = streamRef.current;
                // Attempt to play the video, catching any potential errors
                videoRef.current.play().catch(e => console.error("Video playback failed:", e));
            }
        }
    }, [sessionState]);

    const stopSession = useCallback(async (shouldNavigateBack = false) => {
        setSessionState('ending');
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) { console.error("Error closing session:", e); }
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);

        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().catch(console.error);
        }

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();

        setAiStatus(null);
        setVideoDevices([]);
        setSelectedDeviceId('');
        setTranscripts([]);
        nextStartTimeRef.current = 0;
        setSessionState('idle');
        
        if (shouldNavigateBack) {
            setActiveTool(defaultTool as ToolKey);
        }
    }, [setActiveTool, defaultTool]);
    
    const startSession = async () => {
        setSessionState('starting');
        setError(null);
        setLimitError(null);
        if (!canUseFeature('visualAssistant')) {
            setLimitError("You don't have enough credits for this feature (10 required).");
            setSessionState('idle');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, 
                audio: true 
            });
            streamRef.current = stream;
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            setVideoDevices(videoInputs);
            const currentTrack = stream.getVideoTracks()[0];
            const currentDeviceId = currentTrack.getSettings().deviceId;
            setSelectedDeviceId(currentDeviceId || (videoInputs.length > 0 ? videoInputs[0].deviceId : ''));

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemInstruction = `You are Sparky, a helpful and curious AI visual assistant from EduSpark. You are having a real-time conversation with a user through their camera and microphone. Your persona is enthusiastic and friendly.
- **Be Proactive:** If the user is silent for a few moments but the scene changes, proactively and concisely comment on what you see. For example, "That's a beautiful flower," or "You're holding a textbook." This makes the conversation feel alive.
- **Be Quick:** Keep your responses short and conversational to maintain a low-latency, real-time feel. Use direct language.
- **Be Observant:** Your primary job is to answer the user's questions based on the visual information from the camera feed.
- **Language:** All your spoken responses must be in ${language}.`;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: systemInstruction
                },
                callbacks: {
                    onopen: () => {
                        setAiStatus('listening');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                         if (message.serverContent?.inputTranscription) {
                            setAiStatus('listening');
                            const { text, isFinal } = message.serverContent.inputTranscription;
                             setTranscripts(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.role === 'user' && !last.isFinal) {
                                    const updatedLast = { ...last, text: last.text + text, isFinal: isFinal ?? false };
                                    return [...prev.slice(0, -1), updatedLast];
                                } else if (text.trim()) {
                                    return [...prev, { id: Date.now(), role: 'user', text, isFinal: isFinal ?? false }];
                                }
                                return prev;
                            });
                            if (isFinal) setAiStatus('thinking');
                        }
                
                        if (message.serverContent?.outputTranscription) {
                             setAiStatus('speaking');
                             const { text, isFinal } = message.serverContent.outputTranscription;
                             setTranscripts(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.role === 'model' && !last.isFinal) {
                                     const updatedLast = { ...last, text: last.text + text, isFinal: isFinal ?? false };
                                    return [...prev.slice(0, -1), updatedLast];
                                } else if (text.trim()) {
                                    return [...prev, { id: Date.now(), role: 'model', text, isFinal: isFinal ?? false }];
                                }
                                return prev;
                            });
                        }

                        if (message.serverContent?.turnComplete) {
                            setAiStatus('listening');
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const currentTime = outputAudioContextRef.current.currentTime;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                        
                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(source => { source.stop(); audioSourcesRef.current.delete(source); });
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Session error:", e);
                        setError("A session error occurred. Please try again.");
                        stopSession();
                    },
                    onclose: (e: CloseEvent) => {
                        stopSession();
                    },
                }
            });
            
            await sessionPromiseRef.current;
            useFeature('visualAssistant');
            setSessionState('active');

            if (canvasRef.current && videoRef.current) {
                const canvasEl = canvasRef.current;
                const videoEl = videoRef.current;
                const ctx = canvasEl.getContext('2d');
                if (ctx) {
                    frameIntervalRef.current = window.setInterval(() => {
                        canvasEl.width = videoEl.videoWidth;
                        canvasEl.height = videoEl.videoHeight;
                        ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                        canvasEl.toBlob(
                            async (blob) => {
                                if (blob) {
                                    const base64Data = await blobToBase64(blob);
                                    sessionPromiseRef.current?.then((session) => {
                                      session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                                    });
                                }
                            }, 'image/jpeg', 0.8 
                        );
                    }, 250); // 4 FPS for better responsiveness
                }
            }
        } catch (e: any) {
            console.error("Failed to start session:", e);
            setError(`Could not start session: ${e.message}`);
            stopSession();
        }
    };

    const switchCamera = useCallback(async () => {
        if (videoDevices.length > 1) {
            const currentTrack = streamRef.current?.getVideoTracks()[0];
            const currentDeviceId = currentTrack?.getSettings().deviceId;
            const currentIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId);
            const nextDevice = videoDevices[(currentIndex + 1) % videoDevices.length];
            if (nextDevice) setSelectedDeviceId(nextDevice.deviceId);
        }
    }, [videoDevices]);

    useEffect(() => {
        const changeStream = async () => {
            if (sessionState === 'active' && selectedDeviceId && streamRef.current) {
                const oldTrack = streamRef.current.getVideoTracks()[0];
                if (oldTrack && oldTrack.getSettings().deviceId === selectedDeviceId) return;
                if (oldTrack) { oldTrack.stop(); streamRef.current.removeTrack(oldTrack); }

                try {
                    const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedDeviceId } } });
                    const newVideoTrack = newStream.getVideoTracks()[0];
                    streamRef.current.addTrack(newVideoTrack);
                    if (videoRef.current) {
                        videoRef.current.srcObject = streamRef.current;
                        videoRef.current.play().catch(e => console.error("Camera switch video play failed:", e));
                    }
                } catch(e) {
                    console.error("Error switching camera:", e);
                    setError("Could not switch camera.");
                }
            }
        };
        if(selectedDeviceId) { changeStream(); }
    }, [selectedDeviceId, sessionState]);

    useEffect(() => { return () => { stopSession(); }; }, [stopSession]);
    
    const AiStatusIndicator: React.FC = () => {
        let text;
        let pulseColor;
        switch(aiStatus) {
            case 'listening': text = 'Listening...'; pulseColor = 'bg-green-500'; break;
            case 'speaking': text = 'Speaking...'; pulseColor = 'bg-blue-500'; break;
            case 'thinking': text = 'Thinking...'; pulseColor = 'bg-yellow-500'; break;
            default: return null;
        }
        return (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center space-x-2 p-2 px-4 rounded-full bg-black/40 backdrop-blur-md transition-opacity duration-300">
                <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${pulseColor}`}></span>
                </span>
                <span className="text-sm font-medium">{text}</span>
            </div>
        )
    };

    const PreSessionScreen = () => (
        <div className="h-full w-full bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
             {limitError ? (
                <UpgradePrompt message={limitError} />
             ) : (
                <>
                    <Logo className="w-20 h-20 text-indigo-400 mb-6"/>
                    <h1 className="text-4xl font-bold mb-4">Visual Assistant</h1>
                    <p className="mb-8 text-gray-300 max-w-md mx-auto">Start a live conversation with AI. Point your camera at something and ask questions in real-time.</p>
                    <Button onClick={startSession} isLoading={sessionState === 'starting'} className="px-8 py-4 text-lg">
                        {sessionState === 'starting' ? 'Preparing Camera...' : 'Start Visual Session'}
                    </Button>
                    {error && <p className="mt-4 text-red-400">{error}</p>}
                </>
             )}
             {/* Render back button if not in the middle of starting a session */}
             {sessionState !== 'starting' && (
                <button 
                    onClick={() => setActiveTool(defaultTool as ToolKey)} 
                    className="mt-8 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                   &larr; Go Back to Dashboard
                </button>
             )}
        </div>
    );
    
    if (sessionState !== 'active') return <PreSessionScreen />;

    return (
        <div className="relative h-full w-full bg-black">
            <canvas ref={canvasRef} className="hidden" />
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

            {/* UI Overlays */}
            <div className="fixed inset-0 flex flex-col justify-between p-4 md:p-6 pointer-events-none">
                {/* Header */}
                <header className="flex justify-between items-center w-full">
                    <button onClick={() => stopSession(true)} className="p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 transition-colors pointer-events-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    {videoDevices.length > 1 && (
                        <button onClick={switchCamera} className="p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 transition-colors pointer-events-auto">
                            <SwitchCameraIcon className="w-6 h-6"/>
                        </button>
                    )}
                </header>

                {/* Transcripts */}
                <div className="absolute inset-x-0 bottom-24 p-4 space-y-4 overflow-y-auto max-h-[50vh] [mask-image:linear-gradient(to_bottom,transparent,black_20%)]">
                     {transcripts.map(item => (
                         <div key={item.id} className={`flex items-start gap-3 w-full animate-fade-in-up ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {item.role === 'model' && <div className="p-2 bg-slate-700/80 rounded-full flex-shrink-0 backdrop-blur-md"><Logo className="w-5 h-5 text-indigo-400" /></div>}
                            <div className={`p-3 rounded-2xl max-w-sm break-words text-white shadow-lg backdrop-blur-md ${item.role === 'user' ? 'bg-indigo-600/90 rounded-br-none' : 'bg-slate-700/80 rounded-bl-none'}`}>
                                <p className={!item.isFinal ? 'opacity-70' : ''}>{item.text}</p>
                            </div>
                            {item.role === 'user' && <div className="p-2 bg-slate-700/80 rounded-full flex-shrink-0 backdrop-blur-md"><UserIcon className="w-5 h-5 text-slate-300" /></div>}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                
                {/* Footer */}
                <footer className="w-full flex justify-center items-center flex-col">
                    <AiStatusIndicator />
                    <button onClick={() => stopSession(false)} className="px-6 py-4 bg-red-600/80 rounded-full hover:bg-red-700 transition-colors flex items-center space-x-3 pointer-events-auto backdrop-blur-md shadow-2xl">
                        <MicrophoneIcon className="w-6 h-6"/>
                        <span className="font-bold text-lg">End Session</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default VisualAssistant;