'use client';

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

// Note: Async validation functions have been moved to poll-validation-server.ts
// This includes:
// - validateOptionIndex
// - hasUserVoted
// - userOwnsPoll
