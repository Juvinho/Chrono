
import emojiRegex from 'emoji-regex';

export const containsEmoji = (text: string): boolean => {
  const regex = emojiRegex();
  return regex.test(text);
};

export const validateNoEmojis = (text: string, fieldName: string): { valid: boolean; error?: string } => {
  if (containsEmoji(text)) {
    return {
      valid: false,
      error: `O campo ${fieldName} não pode conter emojis.`
    };
  }
  return { valid: true };
};
/**
 * Extract @mentions from text
 * Matches @username pattern and returns unique usernames (without the @)
 */
export const extractMentions = (text: string): string[] => {
  if (!text) return [];
  
  // Match @word where word is alphanumeric + underscore
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.matchAll(mentionRegex);
  
  const mentions = Array.from(matches).map(m => m[1]);
  // Remove duplicates
  return [...new Set(mentions)];
};