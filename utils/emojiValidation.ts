
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
