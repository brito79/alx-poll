'use server';

import { logAuthEvent } from './security';

// Constants for validation
const MAX_QUESTION_LENGTH = 500;
const MAX_OPTION_LENGTH = 200;
const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sanitizes text input to prevent XSS
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Basic sanitization - remove HTML/script tags
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

/**
 * Validates poll question
 */
export function validateQuestion(question: string): { isValid: boolean; message: string } {
  if (!question || question.trim().length === 0) {
    return {
      isValid: false,
      message: 'Question is required'
    };
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      isValid: false,
      message: `Question must be ${MAX_QUESTION_LENGTH} characters or less`
    };
  }

  return { isValid: true, message: '' };
}

/**
 * Validates poll options
 */
export function validateOptions(options: string[]): { isValid: boolean; message: string; sanitizedOptions?: string[] } {
  // Filter out empty options
  const filteredOptions = options.filter(opt => opt && opt.trim().length > 0);
  
  if (!filteredOptions || filteredOptions.length < MIN_OPTIONS) {
    return {
      isValid: false,
      message: `Please provide at least ${MIN_OPTIONS} options`
    };
  }

  if (filteredOptions.length > MAX_OPTIONS) {
    return {
      isValid: false,
      message: `Maximum ${MAX_OPTIONS} options allowed`
    };
  }

  // Check for duplicate options
  const optionsSet = new Set(filteredOptions.map(opt => opt.toLowerCase().trim()));
  if (optionsSet.size !== filteredOptions.length) {
    return {
      isValid: false,
      message: 'All options must be unique'
    };
  }

  // Check option lengths
  for (const option of filteredOptions) {
    if (option.length > MAX_OPTION_LENGTH) {
      return {
        isValid: false,
        message: `Options must be ${MAX_OPTION_LENGTH} characters or less`
      };
    }
  }

  // Sanitize all options
  const sanitizedOptions = filteredOptions.map(sanitizeText);

  return { 
    isValid: true, 
    message: '',
    sanitizedOptions
  };
}

/**
 * Validates poll ID format (UUID)
 */
export function validatePollId(id: string): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

/**
 * Validates option index is within valid range
 */
export async function validateOptionIndex(pollId: string, optionIndex: number, supabaseClient: any): Promise<{ isValid: boolean; message: string }> {
  try {
    // First validate poll ID format
    if (!validatePollId(pollId)) {
      return { isValid: false, message: 'Invalid poll ID format' };
    }

    // Check if option index is a valid number
    if (typeof optionIndex !== 'number' || isNaN(optionIndex) || optionIndex < 0) {
      return { isValid: false, message: 'Invalid option index' };
    }

    // Get poll to check option index against available options
    const { data, error } = await supabaseClient
      .from('polls')
      .select('options')
      .eq('id', pollId)
      .single();

    if (error || !data) {
      await logAuthEvent('vote_validation_error', false, { 
        details: `Poll not found: ${pollId}` 
      });
      return { isValid: false, message: 'Poll not found' };
    }

    // Check if option index is valid for this poll
    if (!Array.isArray(data.options) || optionIndex >= data.options.length) {
      await logAuthEvent('vote_validation_error', false, { 
        details: `Invalid option index: ${optionIndex} for poll ${pollId}` 
      });
      return { isValid: false, message: 'Invalid option selected' };
    }

    return { isValid: true, message: '' };
  } catch (err) {
    console.error('Error validating option index:', err);
    return { isValid: false, message: 'Error validating option' };
  }
}

/**
 * Check if user has already voted on a poll
 */
export async function hasUserVoted(pollId: string, userId: string, supabaseClient: any): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabaseClient
      .from('votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .single();

    return !!data;
  } catch (err) {
    console.error('Error checking if user voted:', err);
    return false;
  }
}

/**
 * Check if user owns the poll
 */
export async function userOwnsPoll(pollId: string, userId: string, supabaseClient: any): Promise<boolean> {
  if (!userId || !pollId) return false;
  
  try {
    const { data, error } = await supabaseClient
      .from('polls')
      .select('user_id')
      .eq('id', pollId)
      .single();

    return data && data.user_id === userId;
  } catch (err) {
    console.error('Error checking poll ownership:', err);
    return false;
  }
}
