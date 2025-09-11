'use server';

import { logAuthEvent } from './security';
import { validatePollId } from './poll-validation';

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
