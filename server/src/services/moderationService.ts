
export class ModerationService {
  private badWords: string[] = ['badword1', 'badword2', 'spam']; // Example list

  constructor() {}

  async checkContent(text: string): Promise<{ flagged: boolean; reason?: string }> {
    // 1. Basic Keyword Filtering
    const lowerText = text.toLowerCase();
    for (const word of this.badWords) {
      if (lowerText.includes(word)) {
        return { flagged: true, reason: 'Conteúdo contém palavras proibidas.' };
      }
    }

    // 2. AI Moderation (Placeholder)
    // To enable AI moderation:
    // 1. Get an API Key (e.g., Google Gemini, OpenAI).
    // 2. Set it in .env (e.g., MODERATION_API_KEY).
    // 3. Uncomment and implement the call below.
    
    /*
    if (process.env.MODERATION_API_KEY) {
        try {
            const aiResult = await this.callAIModeration(text);
            if (aiResult.flagged) {
                return aiResult;
            }
        } catch (error) {
            console.error("AI Moderation failed:", error);
            // Decide whether to fail open (allow) or close (block) on error.
        }
    }
    */

    return { flagged: false };
  }

  /*
  private async callAIModeration(text: string): Promise<{ flagged: boolean; reason?: string }> {
      // Implementation for Gemini/OpenAI
      // Example prompt: "Does this text contain hate speech, harassment, or explicit content? Answer JSON."
      return { flagged: false };
  }
  */
}
