import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, ClientMessage } from '@google/genai';
import { Language } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import { AppContext } from '../../contexts/AppContext';
import UpgradePrompt from '../common/UpgradePrompt';
import { ToolKey } from '../../constants';
import { SwitchCameraIcon } from '../icons';
import Button from '../common/Button';
import Spinner from '../common/Spinner';

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
    const { canUseFeature, useFeature, setActiveTool, userRole, language } = useContext(AppContext);
    const { t } = useTranslations();
    const defaultTool = userRole === 'teacher' ? 'lessonPlanner' : 'homeworkHelper';

    const [isSessionActive, setIsSessionActive] = useState(false);
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

    const stopSession = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session:", e);
            }
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);

        if (scriptProcessorRef.current) scriptProcessorRef.current.disconnect();
        if (mediaStreamSourceRef.current) mediaStreamSourceRef.current.disconnect();
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();

        setIsSessionActive(false);
        setVideoDevices([]);
        setSelectedDeviceId('');
        setTranscriptionHistory([]);
        nextStartTimeRef.current = 0;
    }, []);
    
    const startSession = async () => {
        setError(null);
        setLimitError(null);
        if (!canUseFeature('visualAssistant')) {
            setLimitError("You don't have enough credits for this feature (10 required).");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream; // Keep the full stream ref for audio
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            setVideoDevices(videoInputs);
            const initialDeviceId = videoInputs.length > 0 ? videoInputs[0].deviceId : '';
            setSelectedDeviceId(initialDeviceId);
            if (videoRef.current) {
                 videoRef.current.srcObject = new MediaStream(stream.getVideoTracks());
            }

            // Init Audio Contexts
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
                        // Audio Input Streaming
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

                        // Video Input Streaming
                        frameIntervalRef.current = window.setInterval(() => {
                            if (videoRef.current && canvasRef.current) {
                                const video = videoRef.current;
                                const canvas = canvasRef.current;
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                                canvas.toBlob(async (blob) => {
                                    if (blob) {
                                        const base64Data = await blobToBase64(blob);
                                        sessionPromiseRef.current?.then((session) => {
                                            session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                                        });
                                    }
                                }, 'image/jpeg', 0.7);
                            }
                        }, 500); // 2 FPS
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle Transcription
                        const { inputTranscription, outputTranscription, turnComplete } = message.serverContent ?? {};
                        setTranscriptionHistory(prev => {
                            let history = [...prev];
                            if (inputTranscription) {
                                const last = history[history.length - 1];
                                if (last?.role === 'user' && !last.isFinal) {
                                    last.text += inputTranscription.text;
                                } else {
                                    history.push({ role: 'user', text: inputTranscription.text, isFinal: false });
                                }
                            }
                            if (outputTranscription) {
                                 const last = history[history.length - 1];
                                if (last?.role === 'model' && !last.isFinal) {
                                    last.text += outputTranscription.text;
                                } else {
                                    history.push({ role: 'model', text: outputTranscription.text, isFinal: false });
                                }
                            }
                            if (turnComplete) {
                                history = history.map(t => ({...t, isFinal: true}));
                            }
                            return history;
                        });

                        // Handle Audio Output
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const ctx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            source.addEventListener('ended', () => { audioSourcesRef.current.delete(source); });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error', e);
                        setError('A session error occurred. Please restart.');
                        stopSession();
                    },
                    onclose: () => {
                        console.log('Session closed');
                    },
                }
            });

            useFeature('visualAssistant');
            setIsSessionActive(true);
        } catch (err) {
            console.error('Error accessing media devices.', err);
            setError('Could not access camera/microphone. Please grant permissions and try again.');
        }
    };
    
    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);
    
    useEffect(() => {
        if (isSessionActive && selectedDeviceId && streamRef.current) {
            streamRef.current.getVideoTracks().forEach(track => track.stop());
            navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedDeviceId } } })
                .then(newStream => {
                    const newVideoTrack = newStream.getVideoTracks()[0];
                    if (videoRef.current) {
                        videoRef.current.srcObject = new MediaStream([newVideoTrack]);
                    }
                    // Replace the video track in the main stream
                    const oldTrack = streamRef.current!.getVideoTracks()[0];
                    streamRef.current!.removeTrack(oldTrack);
                    streamRef.current!.addTrack(newVideoTrack);
                })
                .catch(err => {
                    console.error('Error switching camera.', err);
                    setError('Could not switch to the selected camera.');
                });
        }
    }, [isSessionActive, selectedDeviceId]);

    return (
        <div className="h-full w-full flex flex-col bg-slate-900 text-white antialiased">
             <button
                onClick={() => isSessionActive ? stopSession() : setActiveTool(defaultTool as ToolKey)}
                className="lg:hidden absolute top-5 left-5 z-30 p-2 bg-black/30 rounded-full text-white hover:bg-black/50 transition-colors"
                aria-label="Go back"
            >
                <BackIcon />
            </button>
            
            {!isSessionActive ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="bg-slate-800 p-8 rounded-2xl text-center max-w-sm shadow-lg border border-slate-700">
                        <h3 className="text-xl font-semibold mb-4 text-white">Start a Visual Session</h3>
                        <p className="mb-6 text-gray-300">Enable your camera and microphone to ask questions about what you see.</p>
                        <Button onClick={startSession}>Start Session</Button>
                        <div className="mt-4 space-y-2">
                            {limitError && <UpgradePrompt message={limitError} />}
                            {error && <div className="p-4 rounded-lg bg-red-900/50 border border-red-500/50 text-red-200 text-sm"><p>{error}</p></div>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative flex-1 w-full overflow-hidden bg-black flex flex-col">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0"></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>

                    {videoDevices.length > 1 && (
                        <button
                            onClick={() => {
                                const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedDeviceId);
                                const nextIndex = (currentIndex + 1) % videoDevices.length;
                                setSelectedDeviceId(videoDevices[nextIndex].deviceId);
                            }}
                            className="absolute top-5 right-5 z-20 p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-colors"
                            aria-label="Switch Camera"
                        >
                            <SwitchCameraIcon className="w-5 h-5" />
                        </button>
                    )}
                    
                    {/* Transcription Overlay */}
                    <div className="absolute bottom-24 left-4 right-4 z-10 p-4 bg-black/50 backdrop-blur-sm rounded-lg max-h-48 overflow-y-auto scrollbar-thin">
                        {transcriptionHistory.map((item, index) => (
                           <p key={index} className={`font-medium ${item.role === 'user' ? 'text-gray-300 italic' : 'text-white'}`}>
                               <span className="font-bold capitalize">{item.role}: </span>{item.text}
                           </p> 
                        ))}
                    </div>

                    <div className="w-full mt-auto p-6 pt-4 bg-gradient-to-t from-slate-900/80 via-slate-900/50 to-transparent flex flex-col items-center z-10">
                       <Button onClick={stopSession} className="w-full max-w-xs from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 hover:shadow-rose-500/50">End Session</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisualAssistant;
