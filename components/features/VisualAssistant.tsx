import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Language } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import { ToolKey } from '../../constants';
import { SwitchCameraIcon } from '../icons';
import Button from '../common/Button';

// #region Helper Functions
// --- Audio Decoding (for TTS) ---
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
// --- Audio Encoding (for Mic) ---
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
// --- Image Encoding ---
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

const BackIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

type Transcription = { role: 'user' | 'model'; text: string; isFinal: boolean };

const VisualAssistant: React.FC = () => {
    const { canUseFeature, useFeature, setActiveTool, userRole } = useContext(AppContext);
    const { language } = useTranslations();
    const defaultTool = userRole === 'teacher' ? 'lessonPlanner' : 'homeworkHelper';

    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
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
            }

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: `You are a helpful visual assistant. Your responses will be in ${language}. Be concise.`
                },
                callbacks: {
                    onopen: () => {
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
                            const { text, isFinal } = message.serverContent.inputTranscription;
                            setTranscriptionHistory(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.role === 'user' && !last.isFinal) {
                                    const updatedLast = { ...last, text: last.text + text, isFinal: isFinal ?? false };
                                    return [...prev.slice(0, -1), updatedLast];
                                }
                                return [...prev, { role: 'user', text, isFinal: isFinal ?? false }];
                            });
                        }
                
                        if (message.serverContent?.outputTranscription) {
                             const { text, isFinal } = message.serverContent.outputTranscription;
                             setTranscriptionHistory(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.role === 'model' && !last.isFinal) {
                                     const updatedLast = { ...last, text: last.text + text, isFinal: isFinal ?? false };
                                    return [...prev.slice(0, -1), updatedLast];
                                }
                                return [...prev, { role: 'model', text, isFinal: isFinal ?? false }];
                            });
                        }

                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64EncodedAudioString && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                            });
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
                            'image/jpeg',
                            0.8 
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
            
            if (nextDevice) {
                setSelectedDeviceId(nextDevice.deviceId);
            }
        }
    }, [videoDevices]);

    useEffect(() => {
        const changeStream = async () => {
            if (isSessionActive && selectedDeviceId && streamRef.current) {
                const currentAudioTracks = streamRef.current.getAudioTracks();
                streamRef.current.getVideoTracks().forEach(track => track.stop());

                try {
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        video: { deviceId: { exact: selectedDeviceId } },
                    });
                    const newVideoTrack = newStream.getVideoTracks()[0];
                    streamRef.current.addTrack(newVideoTrack);
                    streamRef.current.removeTrack(streamRef.current.getVideoTracks()[0]);

                    if (videoRef.current) {
                        const mediaStreamWithAudio = new MediaStream([...currentAudioTracks, newVideoTrack]);
                        videoRef.current.srcObject = mediaStreamWithAudio;
                    }
                } catch(e) {
                    console.error("Error switching camera:", e);
                    setError("Could not switch camera. Please check permissions.");
                }
            }
        };
        if(selectedDeviceId && selectedDeviceId !== streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId) {
            changeStream();
        }
    }, [selectedDeviceId, isSessionActive]);

    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);

    return (
        <div className="h-full w-full bg-black flex flex-col items-center justify-center relative text-white">
            <canvas ref={canvasRef} className="hidden" />
    
            {!isSessionActive ? (
                <div className="text-center p-4">
                     <button onClick={() => stopSession(true)} className="absolute top-4 left-4 p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors z-10">
                        <BackIcon />
                    </button>
                    {limitError ? (
                        <UpgradePrompt message={limitError} />
                    ) : (
                        <>
                            <h1 className="text-2xl font-bold mb-4">Visual Assistant</h1>
                            <p className="mb-8 text-gray-300 max-w-md mx-auto">Start a live conversation with AI. Point your camera at something and ask a question.</p>
                            <Button onClick={startSession} isLoading={isStarting}>
                                {isStarting ? 'Requesting Permissions...' : 'Start Session'}
                            </Button>
                        </>
                    )}
                    {error && <p className="mt-4 text-red-400">{error}</p>}
                </div>
            ) : (
                <>
                    <video ref={videoRef} autoPlay playsInline muted className="absolute top-0 left-0 w-full h-full object-cover z-0" />
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/80 via-black/20 to-black/80 z-10" />
                    
                    <div className="absolute top-4 left-4 right-4 z-20 flex justify-between">
                        <button onClick={() => stopSession(true)} className="p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors">
                            <BackIcon />
                        </button>
                        {videoDevices.length > 1 && (
                             <button onClick={switchCamera} className="p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors">
                                <SwitchCameraIcon />
                            </button>
                        )}
                    </div>
    
                    <div className="relative z-20 flex flex-col justify-end w-full h-full p-4 md:p-8">
                        <div className="max-h-[50%] overflow-y-auto space-y-2 text-lg font-medium flex flex-col">
                            {transcriptionHistory.map((item, index) => (
                                <div key={index} className={`p-3 rounded-xl max-w-[80%] break-words ${item.role === 'user' ? 'bg-blue-600/70 self-end ml-auto' : 'bg-gray-700/70 self-start mr-auto'}`}>
                                    <span className={item.isFinal ? 'opacity-100' : 'opacity-70'}>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default VisualAssistant;
