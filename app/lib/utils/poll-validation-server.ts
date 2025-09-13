'use server';

import { logAuthEvent } from './security';

/**
 * Poll ID Validation Function (Server-side)
 * 
 * Server-side verification of poll ID format against UUID standard.
 * This function is critical to the application's data security as it:
 * 1. Provides authoritative server-side validation of ID formats
 * 2. Prevents database attacks through malformed IDs
 * 3. Acts as a security barrier for all poll-related operations
 * 4. Creates consistency between client and server validation standards
 * 
 * Used in: Server actions before database operations, API endpoints,
 * and anywhere server-side validation of poll IDs is required. This function
 * is called by nearly every poll-related server action as a first step.
 * 
 * @param {string} id - The poll ID to validate
 * @returns {Promise<boolean>} Promise resolving to true if ID is valid
 */
export async function validatePollId(id: string): Promise<boolean> {
  if (!id) return false;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(id);
}

/**
 * Poll Option Validation Function
 * 
 * Verifies that a given option legitimately belongs to the specified poll.
 * This function is essential to voting integrity and security as it:
 * 1. Prevents votes being cast for non-existent or mismatched options
 * 2. Ensures data integrity by validating the option-poll relationship
 * 3. Protects against manipulation of voting endpoints
 * 4. Creates a defense against cross-poll voting attacks
 * 
 * Used in: The vote submission process to verify that the selected option
 * is valid for the given poll before recording the vote. This function
 * is critical for maintaining accurate voting records.
 * 
 * @param {string} pollId - ID of the poll
 * @param {string} optionId - ID of the option to validate
 * @param {any} supabaseClient - Supabase client instance for database operations
 * @returns {Promise<Object>} Validation result with status and error message
 */
export async function validatePollOption(pollId: string, optionId: string, supabaseClient: any): Promise<{ isValid: boolean; message: string }> {
  try {
    // First validate poll ID format
    if (!(await validatePollId(pollId))) {
      return { isValid: false, message: 'Invalid poll ID format' };
    }

    // Validate option ID format
    if (!(await validatePollId(optionId))) {
      return { isValid: false, message: 'Invalid option ID format' };
    }

    // Check if the option belongs to the poll
    const { data, error } = await supabaseClient
      .from('poll_options')
      .select('id')
      .eq('id', optionId)
      .eq('poll_id', pollId)
      .single();

    if (error || !data) {
      await logAuthEvent('vote_validation_error', false, { 
        details: `Option not found for poll: ${optionId} in ${pollId}` 
      });
      return { isValid: false, message: 'Invalid option selected' };
    }

    return { isValid: true, message: '' };
  } catch (err) {
    console.error('Error validating poll option:', err);
    return { isValid: false, message: 'Error validating option' };
  }
}

/**
 * User Vote Verification Function
 * 
 * Checks if an authenticated user has already voted on a specific poll.
 * This function is vital to voting integrity and user experience as it:
 * 1. Prevents duplicate voting by authenticated users
 * 2. Enforces the one-vote-per-user policy for fair polling
 * 3. Provides appropriate feedback to users who attempt to vote again
 * 4. Creates an audit trail connecting users to their voting activity
 * 
 * Used in: Vote submission flows to verify a user hasn't already voted
 * before recording their choice. This function helps maintain the
 * integrity and fairness of poll results.
 * 
 * @param {string} pollId - ID of the poll to check
 * @param {string} userId - ID of the user to check for existing votes
 * @param {any} supabaseClient - Supabase client instance for database operations
 * @returns {Promise<boolean>} True if the user has already voted
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
 * Poll Ownership Verification Function
 * 
 * Determines if a specific user is the creator/owner of a poll.
 * This function is fundamental to the application's authorization model as it:
 * 1. Enforces resource-level access control for poll management
 * 2. Prevents unauthorized modification or deletion of polls
 * 3. Establishes clear ownership boundaries for user-generated content
 * 4. Supports the principle of least privilege in content management
 * 
 * Used in: Poll editing, deletion, and management flows to verify the
 * current user has ownership rights before allowing modifications.
 * This function is essential for maintaining content security.
 * 
 * @param {string} pollId - ID of the poll to check ownership
 * @param {string} userId - ID of the user being verified as owner
 * @param {any} supabaseClient - Supabase client instance for database operations
 * @returns {Promise<boolean>} True if the user owns the poll
 */
export async function userOwnsPoll(pollId: string, userId: string, supabaseClient: any): Promise<boolean> {
  if (!userId || !pollId) return false;
  
  try {
    const { data, error } = await supabaseClient
      .from('polls')
      .select('creator_id')
      .eq('id', pollId)
      .single();

    return data && data.creator_id === userId;
  } catch (err) {
    console.error('Error checking poll ownership:', err);
    return false;
  }
}
