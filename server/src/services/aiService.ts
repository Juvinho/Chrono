import { GoogleGenAI, Type } from "@google/genai";

/**
 * Backend AI Service for Chrono
 * Centralizes all Gemini API calls to prevent API key exposure
 * All AI operations must go through this service
 */

const API_KEY = process.env.GOOGLE_GENAI_API_KEY;

interface GeneratedBioResult {
  bio: string;
}

interface GeneratedReplyResult {
  content: string;
}

interface SentimentAnalysisResult {
  mood: 'neon-joy' | 'void-despair' | 'rage-glitch' | 'zen-stream' | 'neutral';
}

class AIService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: API_KEY });
    } else {
      console.warn('⚠️ GOOGLE_GENAI_API_KEY not configured - AI features disabled');
    }
  }

  /**
   * Generate an optimized bio for a user based on their profile
   */
  async generateBio(userData: {
    username: string;
    bio?: string;
    location?: string;
    website?: string;
    skills?: string[];
    headline?: string;
    profileType?: string;
  }): Promise<string | null> {
    if (!this.ai) {
      console.error('AI service not initialized');
      return null;
    }

    try {
      const context = `
Username: ${userData.username}
Current bio: ${userData.bio || 'No bio'}
Location: ${userData.location || 'Not specified'}
Website: ${userData.website || 'None'}
Skills: ${userData.skills?.join(', ') || 'Not specified'}
Headline: ${userData.headline || 'Not specified'}
Profile type: ${userData.profileType || 'personal'}`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are an expert in personal branding for the cyberpunk social network Chrono.
Generate an attractive, coherent and engaging bio for the user with the following information:

${context}

The bio should:
1. Be concise (max 160 characters for Twitter-like format, or max 280 characters for extended)
2. Reflect the user's personality and interests
3. Include relevant keywords if possible
4. Be creative and memorable
5. Use Portuguese if appropriate

Respond ONLY with the generated bio text, no explanation or quotes.`,
        config: {
          responseMimeType: 'text/plain',
        }
      });

      const generatedBio = response.text?.trim() || null;
      return generatedBio;
    } catch (error) {
      console.error('Error generating bio:', error);
      return null;
    }
  }

  /**
   * Generate a reply to a post
   */
  async generateReply(originalPostContent: string): Promise<string | null> {
    if (!this.ai) return null;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are a user on the Chrono social network. Another user posted: "${originalPostContent}".
Generate a short, natural reply in Portuguese to this post.

The reply should:
1. Be concise (1-3 sentences)
2. Be contextually relevant
3. Show personality
4. Be written in a natural, conversational tone

Respond ONLY with the reply text, no explanation.`,
        config: {
          responseMimeType: 'text/plain',
        }
      });

      return response.text?.trim() || null;
    } catch (error) {
      console.error('Error generating reply:', error);
      return null;
    }
  }

  /**
   * Analyze sentiment/mood of text
   */
  async analyzeSentiment(text: string): Promise<'neon-joy' | 'void-despair' | 'rage-glitch' | 'zen-stream' | 'neutral'> {
    if (!this.ai) return 'neutral';

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Analyze the sentiment of the following text for a cyberpunk social network: "${text}".
Classify it as one of these categories:
- 'neon-joy': Happy, excited, positive, vibrant
- 'void-despair': Sad, melancholic, depressive, nihilistic
- 'rage-glitch': Angry, frustrated, aggressive, chaotic
- 'zen-stream': Calm, relaxed, philosophical, focused
- 'neutral': Informative, neutral, no strong emotion

Respond ONLY with the category identifier (e.g., neon-joy).`,
        config: {
          responseMimeType: 'text/plain',
        }
      });

      const mood = response.text?.trim();
      const validMoods = ['neon-joy', 'void-despair', 'rage-glitch', 'zen-stream', 'neutral'];
      
      if (validMoods.includes(mood || '')) {
        return mood as 'neon-joy' | 'void-despair' | 'rage-glitch' | 'zen-stream' | 'neutral';
      }
      return 'neutral';
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return 'neutral';
    }
  }

  /**
   * Generate image using Imagen
   */
  async generateImage(prompt: string, aspectRatio: string = '1:1'): Promise<string | null> {
    if (!this.ai) return null;

    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-3.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  }

  /**
   * Analyze video content
   */
  async analyzeVideo(prompt: string, videoBase64: string, mimeType: string = 'video/mp4'): Promise<string | null> {
    if (!this.ai) return null;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            text: prompt
          },
          {
            inlineData: {
              data: videoBase64,
              mimeType: mimeType
            }
          }
        ]
      });

      return response.text || null;
    } catch (error) {
      console.error('Error analyzing video:', error);
      return 'Error: Could not analyze the video.';
    }
  }
}

export const aiService = new AIService();
