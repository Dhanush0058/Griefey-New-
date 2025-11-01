import { GoogleGenAI } from '@google/genai';
import type { Department } from '../types';

export let ai: GoogleGenAI | null = null;
if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

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
