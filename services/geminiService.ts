import { GoogleGenAI, Type } from "@google/genai";
import { 
  MODEL_RESEARCH, 
  MODEL_SCRIPTING, 
  MODEL_VISUAL_PLANNING, 
  MODEL_MARKETING, 
  MODEL_LOGIC,
  MODEL_IMAGE_GEN,
  MODEL_IMAGE_EDIT,
  SYSTEM_INSTRUCTION_DIRECTOR,
  SYSTEM_INSTRUCTION_DESIGNER,
  SYSTEM_INSTRUCTION_RESEARCHER,
  SYSTEM_INSTRUCTION_LOGIC,
  SYSTEM_INSTRUCTION_STRATEGIST,
  URL_LEAD_MAGNET
} from "../constants";
import { AspectRatio, ImageSize } from "../types";

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
      // Fallback for Strategy/Scripting to Flash if Pro fails (already handled by logic below, but good for robust retry)
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
export const runResearchAgent = async (topic: string) => {
  const model = MODEL_RESEARCH;
  
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
export const runScriptAgent = async (title: string, videoType: string, keywords: string[]) => {
  const model = MODEL_SCRIPTING;
  
  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Write a script for a "${videoType}" video titled "${title}". Keywords: ${keywords.join(', ')}.
        
        CRITICAL CONSTRAINTS:
        1. Scene Limit: STRICTLY Maximum 20 scenes.
        2. Shot Timing: Each scene MUST be 8-30 seconds.
        3. Total Duration: Target exactly one of: 60s, 90s, 180s, 360s, or 720s based on complexity.
        
        Output format:
        Include the estimated time per scene in the 'sceneBreakdown' array strings (e.g., "[15s] Visual Description {Voiceover}").
        
        IMPORTANT: output ONLY the JSON object.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_DIRECTOR,
          // Removed responseSchema/MimeType to avoid Flash model issues, rely on prompt and cleanJson
        }
      });

      return JSON.parse(cleanJson(response.text || '{}'));
    });
  } catch (error) {
    console.error("Script Agent Failed:", error);
    throw error;
  }
};

// --- Agent: Palzani-23 (Designer) & Palzani-14 (Veo) ---
export const runVisualAgent = async (scriptBody: string) => {
  const model = MODEL_VISUAL_PLANNING;

  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Based on this script body, generate 3 image prompts (for midjourney/imagen) and 3 video prompts (for Veo). Script: ${scriptBody.substring(0, 1000)}...
        Output JSON only.`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_DESIGNER,
        }
      });

      return JSON.parse(cleanJson(response.text || '{}'));
    });
  } catch (error) {
    console.error("Visual Agent Failed:", error);
    throw error;
  }
};

// --- Agent: Palzani-5 (Marketer) ---
export const runMarketingAgent = async (videoNumber: number) => {
  const model = MODEL_MARKETING; // Fast model

  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Determine the CTA strategy for Video #${videoNumber} of the 5-part launch sequence. Video 1-3 should use the Lead Magnet URL: ${URL_LEAD_MAGNET}. Return JSON with targetUrl and offerType.`,
        config: {
          // No tools, so we can use schema if we want, but sticking to text+clean for consistency with Flash
        }
      });
      return JSON.parse(cleanJson(response.text || '{}'));
    });
  } catch (error) {
    console.error("Marketing Agent Failed:", error);
    throw error;
  }
};

// --- Agent: Palzani-O (Automation/Logic) ---
export const runLogicAgent = async (targetUrl: string, videoNumber: number) => {
  const model = MODEL_LOGIC;
  
  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: `Validate the URL "${targetUrl}" for Video #${videoNumber}. Does it match the expected funnel stage? Return JSON with isValid (boolean) and report (string).`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_LOGIC,
        }
      });
      return JSON.parse(cleanJson(response.text || '{}'));
    });
  } catch (error) {
    console.error("Logic Agent Failed:", error);
    throw error;
  }
}

// --- Agent: Palzani-Strat (Strategist) ---
export const runStrategyAgent = async (lastVideoNumber: number) => {
  const model = MODEL_SCRIPTING; // Use Flash (MODEL_SCRIPTING is now flash)
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
export const generateImage = async (prompt: string, aspectRatio: AspectRatio, size: ImageSize) => {
  const model = MODEL_IMAGE_GEN;

  try {
    return await withRetry(async () => {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            // imageSize is NOT supported by gemini-2.5-flash-image
            ...(model.includes('flash') ? {} : { imageSize: size })
          }
        }
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
export const editImage = async (base64Image: string, prompt: string) => {
  const model = MODEL_IMAGE_EDIT;
  // Remove header if present for raw data
  const rawBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

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