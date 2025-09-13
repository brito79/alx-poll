'use client';

import { logAuthEvent } from './security';

// Constants for validation
const MAX_QUESTION_LENGTH = 500;
const MAX_OPTION_LENGTH = 200;
const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Text Sanitization Function
 * 
 * Cleans user input text to prevent XSS attacks and ensure data quality.
 * This function is critical to the application's security as it:
 * 1. Forms the first line of defense against injection attacks
 * 2. Ensures consistent data quality for stored poll content
 * 3. Prevents malicious script execution in user-generated content
 * 4. Creates a boundary between raw user input and stored data
 * 
 * Used in: Poll creation and editing flows before storing user-provided 
 * questions and options. This function is applied to all text content
 * that will be displayed to other users.
 * 
 * @param {string} text - The raw text input to sanitize
 * @returns {string} Sanitized text with potentially harmful content removed
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Basic sanitization - remove HTML/script tags
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

/**
 * Poll Question/Title Validation Function
 * 
 * Ensures that poll questions meet the required format and length constraints.
 * This function is essential to data quality and user experience as it:
 * 1. Enforces required fields to prevent empty or invalid polls
 * 2. Limits question length to maintain UI consistency
 * 3. Provides specific error messages for user guidance
 * 4. Ensures polls have clear, defined questions
 * 
 * Used in: Poll creation and editing flows to validate the main poll question
 * before submission. This validation occurs before database interaction to
 * provide immediate feedback to users.
 * 
 * @param {string} title - The poll question/title to validate
 * @returns {Object} Validation result with isValid flag and error message
 */
export function validateQuestion(title: string): { isValid: boolean; message: string } {
  if (!title || title.trim().length === 0) {
    return {
      isValid: false,
      message: 'Title is required'
    };
  }

  if (title.length > MAX_QUESTION_LENGTH) {
    return {
      isValid: false,
      message: `Title must be ${MAX_QUESTION_LENGTH} characters or less`
    };
  }

  return { isValid: true, message: '' };
}

/**
 * Poll Options Validation Function
 * 
 * Validates and sanitizes an array of poll options against multiple criteria.
 * This function is crucial to poll integrity and usability as it:
 * 1. Ensures polls have a sufficient number of valid options
 * 2. Prevents duplicate options that would confuse voting results
 * 3. Limits option length to maintain UI consistency
 * 4. Sanitizes all options to prevent security vulnerabilities
 * 5. Filters out empty or invalid options
 * 
 * Used in: Poll creation and editing flows to validate the provided options
 * before submission. This comprehensive validation creates a foundation for
 * meaningful voting experiences.
 * 
 * @param {string[]} options - Array of raw option text values
 * @returns {Object} Validation result with status, message, and sanitized options
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
 * Poll ID Validation Function (Client-side)
 * 
 * Verifies that a poll ID matches the expected UUID format.
 * This function is vital to application security and data integrity as it:
 * 1. Prevents malformed IDs that could lead to database errors
 * 2. Acts as a first line of defense against ID tampering
 * 3. Standardizes ID validation across client-side components
 * 4. Filters invalid IDs before network requests are made
 * 
 * Used in: Client-side validation before sending requests to server actions,
 * URL parameter validation, and anywhere poll IDs need verification without
 * server interaction. This client-side complement to server-side validation
 * improves user experience and reduces server load.
 * 
 * @param {string} id - The poll ID to validate
 * @returns {boolean} True if the ID is a valid UUID format, false otherwise
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
