
import { containsEmoji, validateNoEmojis } from './emojiValidation';

describe('emojiValidation', () => {
  test('should detect emojis correctly', () => {
    expect(containsEmoji('hello')).toBe(false);
    expect(containsEmoji('hello 😀')).toBe(true);
    expect(containsEmoji('👨‍👩‍👧‍👦')).toBe(true);
    expect(containsEmoji('🚀 Chrono')).toBe(true);
  });

  test('should return validation error message', () => {
    const result = validateNoEmojis('test 😀', 'Username');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('O campo Username não pode conter emojis.');
  });

  test('should pass valid text', () => {
    const result = validateNoEmojis('test_user', 'Username');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
