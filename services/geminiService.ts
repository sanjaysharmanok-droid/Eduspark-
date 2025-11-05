import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { LessonPlan, Quiz, Presentation, Language, ResponseStyle, PresentationTheme, Fact } from '../types';

// In-memory cache for the user's session
const cache = new Map<string, any>();

// Use a single, top-level instance of the GoogleGenAI class for efficiency and stability.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const languageMap: Record<Language, string> = {
    en: 'English',
    hi: 'Hindi, using the Devanagari script (for example: "नमस्ते")',
    es: 'Spanish',
    fr: 'French',
};

const markdownFixPrompt = (language: Language) => {
    return language !== 'en' ? 'When responding, do not use markdown formatting like asterisks or hashtags. Use plain text with standard punctuation and line breaks.' : '';
}

/**
 * A wrapper function to add retry logic with exponential backoff for API calls.
 * This helps handle transient errors like model overload (503).
 */
const withRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> => {
    let attempt = 0;
    let delay = initialDelay;
    while (attempt < maxRetries) {
        try {
            return await apiCall();
        } catch (error: any) {
            attempt++;
            const errorMessage = error.toString();
            // Check for common transient error messages
            const isRetryable = errorMessage.includes('overloaded') || 
                                errorMessage.includes('503') || 
                                errorMessage.includes('UNAVAILABLE');

            if (isRetryable && attempt < maxRetries) {
                console.warn(`API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, errorMessage);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                // Not a retryable error or max retries reached, re-throw
                console.error(`API call failed after ${attempt} attempts.`);
                throw error;
            }
        }
    }
    // This part should not be reached if maxRetries > 0, but as a fallback:
    throw new Error('API call failed after multiple retries.');
};

// Replaced third-party API call with Gemini for security and consistency.
export const getDetailedFactsResponse = async (topic: string, count: number, language: Language): Promise<{ topic: string, facts: Fact[] }> => {
    const prompt = `Generate ${count} interesting and detailed facts about "${topic}". 
    Use a casual, friendly, and conversational tone, like a knowledgeable friend explaining things. 
    Incorporate an Indian context or relatable examples where possible. Make it easy for a student in India to understand.
    For each fact, provide a short "fact" title and a more detailed "detail" paragraph. 
    The response must have all text content in ${languageMap[language]}.
    The final JSON object should have a key "topic" whose value is the original topic "${topic}", and a key "facts" which is an array of objects.
    Each object in the "facts" array must have two keys: "fact" (a string) and "detail" (a string).`;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING },
                    facts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                fact: { type: Type.STRING },
                                detail: { type: Type.STRING }
                            },
                            required: ['fact', 'detail']
                        }
                    }
                },
                required: ['topic', 'facts']
            }
        }
    }));
    
    const result = JSON.parse(response.text.trim()) as { topic: string, facts: Fact[] };

    if (!result.topic || !Array.isArray(result.facts)) {
        throw new Error("Invalid JSON structure received from AI.");
    }
    
    return result;
};


export const getTopicExplanationWithImage = async (topic: string, language: Language, style: ResponseStyle): Promise<{ explanation: string; imageUrl: string | null }> => {
    const cacheKey = `topicExplanation-${topic}-${language}-${style}`;
    if (cache.has(cacheKey)) {
        console.log(`[Cache Hit] Returning cached data for: ${cacheKey}`);
        return cache.get(cacheKey);
    }
    console.log(`[Cache Miss] Fetching data for: ${cacheKey}`);

    const prompt = `You are an expert educator. Explain the topic of "${topic}" in a ${style.toLowerCase()} style. The response should be in ${languageMap[language]}.
    ${markdownFixPrompt(language)}
    Format the output as a single JSON object with two keys:
    1. "explanation": A well-structured string using markdown for formatting ONLY IF the language is English.
    2. "imagePrompt": A concise, descriptive English prompt for an AI image generator to create a relevant, visually appealing image for this topic.`;

    const textResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    explanation: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING },
                },
                required: ['explanation', 'imagePrompt']
            }
        }
    }));

    const parsedText = JSON.parse(textResponse.text);
    const { explanation, imagePrompt } = parsedText;

    let imageUrl = null;
    if (imagePrompt) {
        try {
            const imageResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            }));
            const part = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part && part.inlineData) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        } catch (e) {
            console.error("Image generation failed, returning text only.", e);
        }
    }
    
    const result = { explanation, imageUrl };
    cache.set(cacheKey, result);
    return result;
};

export const generateLessonPlan = async (topic: string, grade: string, duration: string, language: Language): Promise<LessonPlan> => {
  const cacheKey = `lessonPlan-${topic}-${grade}-${duration}-${language}`;
  if (cache.has(cacheKey)) {
      console.log(`[Cache Hit] Returning cached data for: ${cacheKey}`);
      return cache.get(cacheKey);
  }
  console.log(`[Cache Miss] Fetching data for: ${cacheKey}`);

  const prompt = `Generate a detailed lesson plan for a '${grade}' class on the topic of '${topic}'. The lesson should be designed for a duration of '${duration}'. The output should be a JSON object, with all text content in ${languageMap[language]}.`;
  
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          gradeLevel: { type: Type.STRING },
          duration: { type: Type.STRING },
          learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          materials: { type: Type.ARRAY, items: { type: Type.STRING } },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                duration: { type: Type.INTEGER }
              },
              required: ['title', 'description', 'duration']
            }
          },
          assessment: { type: Type.STRING }
        },
        required: ['title', 'gradeLevel', 'duration', 'learningObjectives', 'materials', 'activities', 'assessment']
      }
    }
  }));

  const result = JSON.parse(response.text.trim()) as LessonPlan;
  cache.set(cacheKey, result);
  return result;
};

export const getSimpleResponse = async (prompt: string, language: Language): Promise<string> => {
    const cacheKey = `simpleResponse-${prompt}-${language}`;
    if (cache.has(cacheKey)) {
        console.log(`[Cache Hit] Returning cached data for: ${cacheKey}`);
        return cache.get(cacheKey);
    }
    console.log(`[Cache Miss] Fetching data for: ${cacheKey}`);

    const fullPrompt = `${prompt} \n\nRespond in ${languageMap[language]}. ${markdownFixPrompt(language)}`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: fullPrompt,
    }));

    const result = response.text;
    cache.set(cacheKey, result);
    return result;
};

export const getSmartResponse = async (prompt: string, imageBase64: string | null, useThinkingMode: boolean, language: Language): Promise<string> => {
    const model = useThinkingMode ? 'gemini-2.5-pro' : (imageBase64 ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite');
    const fullPrompt = `${prompt} \n\nRespond in ${languageMap[language]}. ${markdownFixPrompt(language)}`;
    const parts: any[] = [{ text: fullPrompt }];

    if (imageBase64) {
        const mimeType = imageBase64.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
        const data = imageBase64.split(',')[1];
        parts.unshift({ inlineData: { mimeType, data } });
    }

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model,
        contents: { parts },
        ...(useThinkingMode && { config: { thinkingConfig: { thinkingBudget: 32768 } } }),
    }));
    return response.text;
};

export const generateSpeech = async (text: string): Promise<string> => {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
    }));
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned from API.");
    return base64Audio;
};

export const generateVisualPresentation = async (topic: string, numSlides: number, theme: PresentationTheme, language: Language): Promise<Presentation> => {
    const cacheKey = `visualPresentation-${topic}-${numSlides}-${theme}-${language}`;
    if (cache.has(cacheKey)) {
        console.log(`[Cache Hit] Returning cached data for: ${cacheKey}`);
        return cache.get(cacheKey);
    }
    console.log(`[Cache Miss] Fetching data for: ${cacheKey}`);
    
    const textGenPrompt = `Generate a presentation on "${topic}" for ~${numSlides} slides, in a ${theme.toLowerCase()} style. The entire text output must be in ${languageMap[language]}.
    For each slide, provide:
    1. A short "title".
    2. "content" as an array of short bullet points.
    3. Brief "speakerNotes".
    4. A descriptive, artistic English "imagePrompt" for an AI image generator to create a relevant background image.
    The output must be a single JSON object.`;

    const textResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: textGenPrompt,
        config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 32768 },
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING },
                    slides: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                content: { type: Type.ARRAY, items: { type: Type.STRING } },
                                speakerNotes: { type: Type.STRING },
                                imagePrompt: { type: Type.STRING }
                            },
                            required: ['title', 'content', 'speakerNotes', 'imagePrompt']
                        }
                    }
                },
                required: ['topic', 'slides']
            }
        }
    }));

    const presentationOutline = JSON.parse(textResponse.text) as Presentation & { slides: { imagePrompt: string }[] };
    
    for (const slide of presentationOutline.slides) {
        try {
            const imageResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: slide.imagePrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            }));
            const part = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part && part.inlineData) {
                (slide as any).imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        } catch (e) { console.error(`Image generation failed for prompt: "${slide.imagePrompt}"`, e); }
    }

    cache.set(cacheKey, presentationOutline);
    return presentationOutline;
};


export const generateQuiz = async (topic: string, numQuestions: number, difficulty: string, language: Language): Promise<Quiz> => {
    const cacheKey = `quiz-${topic}-${numQuestions}-${difficulty}-${language}`;
    if (cache.has(cacheKey)) {
        console.log(`[Cache Hit] Returning cached data for: ${cacheKey}`);
        return cache.get(cacheKey);
    }
    console.log(`[Cache Miss] Fetching data for: ${cacheKey}`);

    const prompt = `Generate a quiz with ${numQuestions} questions on the topic of '${topic}' for a ${difficulty} level. The output must be a JSON object, with all text content in ${languageMap[language]}. Each question must have exactly 4 options and one correct answer.`;
    
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                correctAnswer: { type: Type.STRING }
                            },
                            required: ['question', 'options', 'correctAnswer']
                        }
                    }
                },
                required: ['topic', 'questions']
            }
        }
    }));

    const result = JSON.parse(response.text.trim()) as Quiz;
    cache.set(cacheKey, result);
    return result;
}

export const generateSummary = async (text: string, style: 'bullets' | 'paragraph', language: Language): Promise<string> => {
    const cacheKey = `summary-${style}-${language}-${text.substring(0, 100)}`;
    if (cache.has(cacheKey)) {
        console.log(`[Cache Hit] Returning cached data for: ${cacheKey}`);
        return cache.get(cacheKey);
    }
    console.log(`[Cache Miss] Fetching data for: ${cacheKey}`);

    const prompt = `Summarize the following text in a ${style === 'bullets' ? 'concise bullet points' : 'single, well-written paragraph'} format. The summary must be in ${languageMap[language]}.
    
    Text to summarize: "${text}"

    ${markdownFixPrompt(language)}
    `;

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    }));

    const result = response.text;
    cache.set(cacheKey, result);
    return result;
};


export const getLiveResponse = async (prompt: string, imageBase64: string, language: Language): Promise<string> => {
    const fullPrompt = `Analyze the attached image and answer this question: "${prompt}". Respond in ${languageMap[language]}. ${markdownFixPrompt(language)}`;
    const mimeType = imageBase64.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
    const data = imageBase64.split(',')[1];
    
    const parts = [
        { inlineData: { mimeType, data } },
        { text: fullPrompt }
    ];

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
    }));
    return response.text;
};