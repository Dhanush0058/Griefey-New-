import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { Department, ComplaintCategory } from '../types';
import { CATEGORIES } from '../constants';


export let ai: GoogleGenAI | null = null;
if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const fileToGenerativePart = (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      } else {
        reject(new Error('Failed to read file as base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};


export const translateText = async (text: string, targetLanguage: string = 'en'): Promise<string> => {
    if (!ai) {
        console.warn("Google GenAI API key not configured. Skipping translation.");
        return text; // Return original text if translation is skipped
    }
    try {
        const prompt = `Translate the following text to ${targetLanguage}. Respond with only the translated text, nothing else.\n\nText: "${text}"`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error translating text:", error);
        return text; // Fallback to original text on error
    }
};

export const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string | undefined> => {
    if (!ai) {
        console.warn("Google GenAI API key not configured. Skipping address lookup.");
        return undefined;
    }
    try {
        const prompt = `Provide a concise street address for the following coordinates: latitude ${lat}, longitude ${lng}. Only return the address, without any preamble.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error getting address from coordinates:", error);
        return undefined;
    }
};

export const routeComplaintToDepartment = async (description: string, departments: Department[]): Promise<string | null> => {
    if (!ai) {
        console.warn("Google GenAI API key not configured. Skipping department routing.");
        return null;
    }
    if (departments.length === 0) {
        console.warn("No departments available for routing.");
        return null;
    }

    const departmentNames = departments.map(d => d.name).join(', ');

    try {
        const prompt = `Based on the following complaint, which of these departments is the most suitable for handling it?
        Complaint: "${description}"
        Available Departments: ${departmentNames}
        
        Respond with only the name of the most appropriate department from the list provided.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const predictedDeptName = response.text.trim();
        
        // Validate that the model returned a valid department name
        const foundDept = departments.find(d => d.name.toLowerCase() === predictedDeptName.toLowerCase());
        
        return foundDept ? foundDept.id : null;

    } catch (error) {
        console.error("Error routing complaint with Gemini:", error);
        return null;
    }
};

export const analyzeImageForComplaint = async (imageFile: File): Promise<{ title: string; category: ComplaintCategory } | null> => {
    if (!ai) {
        console.warn("Google GenAI API key not configured. Skipping image analysis.");
        return null;
    }
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        const validCategories = CATEGORIES.join(', ');

        const prompt = `Analyze the attached image of a civic issue. Based on the image, suggest a concise, descriptive title (5-7 words) and the most appropriate category for this complaint. 
        Available categories are: ${validCategories}.
        
        Respond with a JSON object containing two keys: "title" and "category". The category must be one of the provided options.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
             config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        category: { type: Type.STRING }
                    },
                },
            },
        });
        
        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);

        // Validate the category from the response
        if (result.title && result.category && CATEGORIES.includes(result.category)) {
            return {
                title: result.title,
                category: result.category as ComplaintCategory,
            };
        }
        return null;
    } catch (error) {
        console.error("Error analyzing image with Gemini:", error);
        return null;
    }
};

export const checkSemanticSimilarity = async (description1: string, description2: string): Promise<boolean> => {
    if (!ai) {
        console.warn("Google GenAI API key not configured. Skipping semantic check.");
        return false;
    }
    try {
        const prompt = `Do the following two complaint descriptions refer to the exact same civic issue? 
        Description 1: "${description1}"
        Description 2: "${description2}"

        Respond with only "Yes" or "No".`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        return response.text.trim().toLowerCase() === 'yes';
    } catch (error) {
        console.error("Error checking semantic similarity:", error);
        return false;
    }
};