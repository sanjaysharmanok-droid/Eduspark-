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
function encode(bytes: Uint8Array) {
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

type Transcription = { role: 'user' | 'model'; text: string; isFinal: boolean };
type SessionStatus = 'idle' | 'listening' | 'speaking' | 'thinking';

const VisualAssistant: React.FC = () => {
    const { canUseFeature, useFeature, setActiveTool, userRole } = useContext(AppContext);
    const { language } = useTranslations();
    const defaultTool = userRole === 'teacher' ? 'lessonPlanner' : 'homeworkHelper';

    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [status, setStatus] = useState<SessionStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [limitError, setLimitError] = useState<string | null>(null);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [transcriptionHistory, setTranscriptionHistory] = useState<Transcription[]>([]);

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
    }, [transcriptionHistory]);

    const stopSession = useCallback(async (shouldNavigateBack = false) => {
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
        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();

        setIsSessionActive(false);
        setIsStarting(false);
        setStatus('idle');
        setVideoDevices([]);
        setSelectedDeviceId('');
        setTranscriptionHistory([]);
        nextStartTimeRef.current = 0;
        
        if (shouldNavigateBack) {
            setActiveTool(defaultTool as ToolKey);
        }
    }, [setActiveTool, defaultTool]);
    
    const startSession = async () => {
        setIsStarting(true);
        setError(null);
        setLimitError(null);
        if (!canUseFeature('visualAssistant')) {
            setLimitError("You don't have enough credits for this feature (10 required).");
            setIsStarting(false);
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

            if (videoRef.current) {
                 videoRef.current.srcObject = stream;
                 videoRef.current.play().catch(e => console.error("Initial video play failed:", e));
            }

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemInstruction = `You are a helpful and interactive visual assistant. You will receive a continuous stream of images from a user's camera and their voice. Your goal is to have a natural, real-time conversation about what the user is seeing.
- When the user asks a question, answer it based on the visual context.
- If the user is quiet for a moment but the scene changes, you can proactively comment on what you see. For example, "That's an interesting painting," or "It looks like you're holding a book."
- Keep your responses concise and conversational to maintain a low-latency feel.
- All your spoken responses must be in ${language}.`;

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
                        setStatus('listening');
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
                            setStatus('listening');
                            const { text, isFinal } = message.serverContent.inputTranscription;
                             setTranscriptionHistory(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.role === 'user' && !last.isFinal) {
                                    const updatedLast = { ...last, text: last.text + text, isFinal: isFinal ?? false };
                                    return [...prev.slice(0, -1), updatedLast];
                                } else if (text.trim()) {
                                    return [...prev, { role: 'user', text, isFinal: isFinal ?? false }];
                                }
                                return prev;
                            });
                            if (isFinal) setStatus('thinking');
                        }
                
                        if (message.serverContent?.outputTranscription) {
                             setStatus('speaking');
                             const { text, isFinal } = message.serverContent.outputTranscription;
                             setTranscriptionHistory(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.role === 'model' && !last.isFinal) {
                                     const updatedLast = { ...last, text: last.text + text, isFinal: isFinal ?? false };
                                    return [...prev.slice(0, -1), updatedLast];
                                } else if (text.trim()) {
                                    return [...prev, { role: 'model', text, isFinal: isFinal ?? false }];
                                }
                                return prev;
                            });
                        }

                        if (message.serverContent?.turnComplete) {
                            setStatus('listening');
                        }

                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64EncodedAudioString && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                        
                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            audioSourcesRef.current.forEach(source => {
                                source.stop();
                                audioSourcesRef.current.delete(source);
                            });
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Session error:", e);
                        setError("A session error occurred. Please try again.");
                        stopSession();
                    },
                    onclose: (e: CloseEvent) => {
                        console.log("Session closed:", e);
                        stopSession();
                    },
                }
            });
            
            await sessionPromiseRef.current;
            useFeature('visualAssistant');
            setIsSessionActive(true);

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
                                      session.sendRealtimeInput({
                                        media: { data: base64Data, mimeType: 'image/jpeg' }
                                      });
                                    });
                                }
                            },
                            'image/jpeg', 0.8 
                        );
                    }, 1000 / 2); 
                }
            }
        } catch (e: any) {
            console.error("Failed to start session:", e);
            setError(`Could not start session: ${e.message}`);
            stopSession();
        } finally {
            setIsStarting(false);
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
            if (isSessionActive && selectedDeviceId && streamRef.current) {
                const oldTrack = streamRef.current.getVideoTracks()[0];
                
                // Do nothing if we are already on the selected device.
                if (oldTrack && oldTrack.getSettings().deviceId === selectedDeviceId) {
                    return;
                }

                // Stop and remove the old track from the stream.
                if (oldTrack) {
                    oldTrack.stop();
                    streamRef.current.removeTrack(oldTrack);
                }

                try {
                    // Get a new stream with the selected video device.
                    const newStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedDeviceId } } });
                    const newVideoTrack = newStream.getVideoTracks()[0];
                    
                    // Add the new video track to our main stream.
                    streamRef.current.addTrack(newVideoTrack);

                    // Re-assigning the srcObject ensures the video element updates.
                    if (videoRef.current) {
                        videoRef.current.srcObject = streamRef.current;
                        videoRef.current.play().catch(e => console.error("Camera switch video play failed:", e));
                    }
                } catch(e) {
                    console.error("Error switching camera:", e);
                    setError("Could not switch camera. Please check permissions.");
                }
            }
        };
        
        // Trigger the change only when a device is selected.
        if(selectedDeviceId) {
            changeStream();
        }
    }, [selectedDeviceId, isSessionActive]);


    useEffect(() => { return () => { stopSession(); }; }, [stopSession]);
    
    const StatusIndicator: React.FC = () => {
        let text, color, animate;
        switch(status) {
            case 'listening': text = 'Listening...'; color = 'bg-green-500'; animate = true; break;
            case 'speaking': text = 'Speaking...'; color = 'bg-blue-500'; animate = true; break;
            case 'thinking': text = 'Thinking...'; color = 'bg-yellow-500'; animate = true; break;
            default: text = 'Idle'; color = 'bg-gray-500'; animate = false; break;
        }
        return (
            <div className="flex items-center space-x-2">
                <span className={`relative flex h-3 w-3`}>
                    <span className={`${color} rounded-full h-full w-full`}></span>
                    {animate && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}></span>}
                </span>
                <span className="text-sm text-gray-300">{text}</span>
            </div>
        )
    };

    return (
        <div className="relative h-full w-full bg-slate-900 text-white flex flex-col md:flex-row overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />

            {limitError && (
                <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center p-4">
                    <UpgradePrompt message={limitError} />
                </div>
            )}

            {/* Video Container */}
            <div className="relative flex-1 bg-black flex items-center justify-center group">
                {!isSessionActive ? (
                    <div className="text-center p-4 flex flex-col items-center justify-center h-full">
                        <Logo className="w-16 h-16 text-indigo-400 mb-4"/>
                        <h1 className="text-2xl font-bold mb-4">Visual Assistant</h1>
                        <p className="mb-8 text-gray-300 max-w-md mx-auto">Start a live conversation. Point your camera at something and ask a question.</p>
                        <Button onClick={startSession} isLoading={isStarting} disabled={!!limitError}>
                            {isStarting ? 'Requesting Permissions...' : 'Start Session'}
                        </Button>
                        {error && !limitError && <p className="mt-4 text-red-400">{error}</p>}
                    </div>
                ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}

                {isSessionActive && (
                    <div className="absolute top-4 left-4 right-4 z-20 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => stopSession(true)} className="p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="flex space-x-2">
                            {videoDevices.length > 1 && (
                                <button onClick={switchCamera} className="p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors">
                                    <SwitchCameraIcon />
                                </button>
                            )}
                             <button onClick={() => stopSession(false)} className="px-4 py-2 bg-red-600/80 rounded-full hover:bg-red-700 transition-colors flex items-center space-x-2">
                                <MicrophoneIcon className="w-5 h-5"/><span>End</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat/Transcription Container */}
            <div className={`md:w-1/3 md:max-w-md bg-slate-800 flex flex-col h-2/5 md:h-full transition-all duration-300 ${!isSessionActive && 'hidden md:flex'}`}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold">Conversation</h2>
                    {isSessionActive && <StatusIndicator />}
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                     {transcriptionHistory.length === 0 && (
                        <div className="text-center text-slate-400 h-full flex flex-col justify-center items-center">
                           <p className="max-w-xs">{isSessionActive ? 'Start talking to see the conversation here.' : 'Start a session to begin the conversation.'}</p>
                        </div>
                    )}
                    {transcriptionHistory.map((item, index) => (
                         <div key={index} className={`flex items-start gap-3 ${item.role === 'user' ? 'justify-end' : ''}`}>
                            {item.role === 'model' && <div className="p-2 bg-slate-700 rounded-full flex-shrink-0"><Logo className="w-5 h-5 text-indigo-400" /></div>}
                            <div className={`p-3 rounded-2xl max-w-[85%] break-words text-white ${item.role === 'user' ? 'bg-indigo-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
                                <span className={!item.isFinal ? 'opacity-70' : ''}>{item.text}</span>
                            </div>
                            {item.role === 'user' && <div className="p-2 bg-slate-700 rounded-full flex-shrink-0"><UserIcon className="w-5 h-5 text-slate-300" /></div>}
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
            </div>
        </div>
    );
};

export default VisualAssistant;
