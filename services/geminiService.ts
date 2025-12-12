import { GoogleGenAI, Type } from "@google/genai";
import { 
  MODEL_CONFIGS,
  SYSTEM_INSTRUCTION_DIRECTOR,
  SYSTEM_INSTRUCTION_DESIGNER,
  SYSTEM_INSTRUCTION_RESEARCHER,
  SYSTEM_INSTRUCTION_LOGIC,
  SYSTEM_INSTRUCTION_STRATEGIST,
  URL_LEAD_MAGNET
} from "../constants";
import { AspectRatio, ImageSize, ModelTier } from "../types";

// Helper to get a fresh client instance with the latest env key or user stored key
const getAiClient = () => {
  // Prioritize local storage (user entered), then environment variable
  const storedKey = localStorage.getItem('quillnexus_api_key');
  const apiKey = storedKey || process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

// Retry helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 429 Resource Exhausted or 503 Service Unavailable
    const isRateLimit = error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
    const isServerOverload = error?.status === 503 || error?.code === 503;

    if (retries > 0 && (isRateLimit || isServerOverload)) {
      console.warn(`API Request failed with ${error.status || 'rate limit'}. Retrying in ${delayMs}ms...`);
      // Fallback logic handled within specific agents if needed, this handles raw retries
      await wait(delayMs);
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

// Robust JSON extraction helper
const cleanJson = (text: string): string => {
  if (!text) return '{}';
  
  // Try to find valid JSON structure first
  const firstOpen = text.indexOf('{');
  const lastClose = text.lastIndexOf('}');
  
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    return text.substring(firstOpen, lastClose + 1);
  }
  
  // Fallback cleaning for markdown blocks if braces aren't clear
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// --- Agent: Palzani-16 (Researcher) ---
export const runResearchAgent = async (topic: string, tier: ModelTier = 'flash') => {
  const model = MODEL_CONFIGS[tier].research;
  
  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Conduct research for a video about: ${topic}. Find 5 keywords and 1 best title.
        
        You must return a valid JSON object with the following structure:
        {
          "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
          "selectedTitle": "The Generated Title"
        }
        
        IMPORTANT: output ONLY the JSON object. Start your response with '{' and end with '}'. Do not include any other text, explanations, or markdown formatting.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_RESEARCHER,
          tools: [{ googleSearch: {} }],
          // responseMimeType and responseSchema are NOT allowed when using googleSearch tool
        }
      });

      const text = cleanJson(response.text || '{}');

      try {
        return JSON.parse(text);
      } catch (e) {
        console.warn("JSON parse failed, returning fallback", text);
        return { keywords: [], selectedTitle: "Research Failed - Retry" };
      }
    });
  } catch (error) {
    console.error("Research Agent Failed:", error);
    throw error;
  }
};

// --- Agent: Palzani-26 (Director) ---
export const runScriptAgent = async (title: string, videoType: string, keywords: string[], tier: ModelTier = 'flash') => {
  const model = MODEL_CONFIGS[tier].scripting;
  
  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Write a script for a "${videoType}" video titled "${title}". Keywords: ${keywords.join(', ')}.
        
        CRITICAL CONSTRAINTS:
        1. Scene Limit: STRICTLY Maximum 20 scenes.
        2. Shot Timing: Each scene MUST be 8-30 seconds.
        3. Total Duration: Target exactly one of: 60s, 90s, 180s, 360s, or 720s.
        
        ENSURE 'hook', 'body', and 'cta' are filled with high-quality content. Do not return undefined or null.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_DIRECTOR,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hook: { type: Type.STRING },
              body: { type: Type.STRING },
              cta: { type: Type.STRING },
              sceneBreakdown: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["hook", "body", "cta", "sceneBreakdown"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      // Fallback validation
      if (!data.body) data.body = "Script body generation failed. Please retry.";
      if (!data.cta) data.cta = "Call to action generation failed.";

      return data;
    });
  } catch (error) {
    console.error("Script Agent Failed:", error);
    throw error;
  }
};

// --- Agent: Palzani-23 (Designer) & Palzani-14 (Veo) ---
export const runVisualAgent = async (scenes: string[], tier: ModelTier = 'flash') => {
  const model = MODEL_CONFIGS[tier].visual;

  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Analyze these script scenes and generate visual prompts.
        
        SCENES (${scenes.length} total):
        ${JSON.stringify(scenes)}

        REQUIREMENTS:
        1. 'imagePrompts': Generate exactly ONE visual prompt for EACH scene provided. The array length MUST match the input scenes length (${scenes.length}).
        2. 'thumbnailPrompt': Generate one high-quality prompt for the video thumbnail.
        3. 'videoPrompts': Generate 3 abstract B-Roll video concepts.
        `,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_DESIGNER,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              thumbnailPrompt: { type: Type.STRING },
              imagePrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              videoPrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["thumbnailPrompt", "imagePrompts", "videoPrompts"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    });
  } catch (error) {
    console.error("Visual Agent Failed:", error);
    throw error;
  }
};

// --- Agent: Palzani-5 (Marketer) ---
export const runMarketingAgent = async (videoNumber: number, tier: ModelTier = 'flash') => {
  const model = MODEL_CONFIGS[tier].marketing;

  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Determine the CTA strategy for Video #${videoNumber} of the 5-part launch sequence. Video 1-3 should use the Lead Magnet URL: ${URL_LEAD_MAGNET}.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              targetUrl: { type: Type.STRING },
              offerType: { type: Type.STRING }
            },
            required: ["targetUrl", "offerType"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
    });
  } catch (error) {
    console.error("Marketing Agent Failed:", error);
    throw error;
  }
};

// --- Agent: Palzani-O (Automation/Logic) ---
export const runLogicAgent = async (targetUrl: string, videoNumber: number, tier: ModelTier = 'flash') => {
  const model = MODEL_CONFIGS[tier].logic;
  
  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Validate the URL "${targetUrl}" for Video #${videoNumber}. Does it match the expected funnel stage?`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_LOGIC,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              report: { type: Type.STRING }
            },
            required: ["isValid", "report"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
    });
  } catch (error) {
    console.error("Logic Agent Failed:", error);
    throw error;
  }
}

// --- Agent: Palzani-Strat (Strategist) ---
export const runStrategyAgent = async (lastVideoNumber: number, tier: ModelTier = 'flash') => {
  const model = MODEL_CONFIGS[tier].strategy;
  const start = lastVideoNumber + 1;
  const end = lastVideoNumber + 5;

  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `We have completed up to Video #${lastVideoNumber}.
        Step 1: Research current trending AI topics that align with our Content Pillars.
        Step 2: Generate 5 NEW Video Topics for the next phase (Videos #${start} to #${end}).
        
        You must return a valid JSON object with the following structure:
        {
          "topics": {
            "${start}": "Topic Title",
            "${start + 1}": "Topic Title",
            "${start + 2}": "Topic Title",
            "${start + 3}": "Topic Title",
            "${end}": "Topic Title"
          }
        }
        
        IMPORTANT: output ONLY the JSON object. Do not include markdown formatting.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_STRATEGIST,
          tools: [{ googleSearch: {} }], // Enable search for trends
        }
      });
      
      const data = JSON.parse(cleanJson(response.text || '{}'));
      return data.topics || {};
    });
  } catch (error) {
    console.error("Strategy Agent Failed:", error);
    throw error;
  }
};

// --- Feature: Actual Image Generation (Nano Banana Pro) ---
export const generateImage = async (prompt: string, aspectRatio: AspectRatio, size: ImageSize, tier: ModelTier = 'flash', referenceImage?: string | null) => {
  const model = MODEL_CONFIGS[tier].imageGen;

  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const config: any = {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      };

      // imageSize is NOT supported by gemini-2.5-flash-image
      if (model.includes('pro')) {
        config.imageConfig.imageSize = size;
      }

      let contents: any = prompt;

      // Handle Reference Image for Multimodal prompting
      if (referenceImage) {
         // Clean base64 header if present
         const rawBase64 = referenceImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
         contents = {
            parts: [
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: rawBase64
                    }
                },
                { text: prompt }
            ]
         };
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: config
      });

      // Extract image
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    });
  } catch (error) {
    console.error("Image Gen Failed:", error);
    throw error;
  }
};

// --- Feature: Image Editing (Nano Banana) ---
export const editImage = async (base64Image: string, prompt: string, tier: ModelTier = 'flash') => {
  const model = MODEL_CONFIGS[tier].imageEdit;
  // Remove header if present for raw data
  const rawBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: rawBase64
              }
            },
            { text: prompt }
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    });

  } catch (error) {
    console.error("Image Edit Failed:", error);
    throw error;
  }
};
