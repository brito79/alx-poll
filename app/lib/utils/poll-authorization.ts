'use server';

import { createClient } from '@/lib/supabase/server';
import { logSecurityEvent } from './security';

/**
 * Verifies if a user has access to a specific poll
 * @param pollId The ID of the poll to check
 * @param userId The user ID to verify ownership
 * @returns Whether the user owns the poll
 */
export async function verifyPollOwnership(pollId: string, userId: string): Promise<boolean> {
  if (!pollId || !userId) return false;
  
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('polls')
      .select('user_id')
      .eq('id', pollId)
      .single();
      
    if (error || !data) {
      await logSecurityEvent('poll_ownership_verification_failed', false, {
        userId,
        pollId,
        details: error ? error.message : 'Poll not found'
      });
      return false;
    }
    
    const isOwner = data.user_id === userId;
    
    if (!isOwner) {
      await logSecurityEvent('unauthorized_poll_access_attempt', false, {
        userId,
        pollId,
        details: 'User attempted to access poll they do not own'
      });
    }
    
    return isOwner;
  } catch (err) {
    console.error('Error verifying poll ownership:', err);
    await logSecurityEvent('poll_ownership_verification_error', false, {
      userId,
      pollId,
      details: err instanceof Error ? err.message : String(err)
    });
    return false;
  }
}

/**
 * Centralizes authorization checks for poll actions
 * @param action The action being performed
 * @param pollId The poll ID
 * @param userId The user ID
 * @returns Whether the action is authorized
 */
export async function isPollActionAuthorized(
  action: 'view' | 'edit' | 'delete' | 'vote',
  pollId: string,
  userId?: string
): Promise<boolean> {
  // Public polls can be viewed by anyone
  if (action === 'view') return true;
  
  // For other actions, user must be logged in
  if (!userId) return false;
  
  // Edit and delete require ownership
  if (action === 'edit' || action === 'delete') {
    return await verifyPollOwnership(pollId, userId);
  }
  
  // By default, allow voting for authenticated users
  // In a real app, might check if they've already voted
  return true;
}
