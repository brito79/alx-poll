"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { 
  sanitizeText, 
  validateOptions, 
  validateQuestion, 
  validatePollId
} from "../utils/poll-validation";
import {
  validateOptionIndex,
  userOwnsPoll,
  hasUserVoted
} from "../utils/poll-validation-server";
import { checkPollActionRateLimit, logSecurityEvent } from "../utils/security";

// CREATE POLL
export async function createPoll(formData: FormData) {
  try {
    const supabase = await createClient();

    // Get and sanitize input
    const rawQuestion = formData.get("question") as string;
    const rawOptions = formData.getAll("options").filter(Boolean) as string[];
    
    // Sanitize the question
    const question = sanitizeText(rawQuestion);
    
    // Validate question
    const questionValidation = validateQuestion(question);
    if (!questionValidation.isValid) {
      return { error: questionValidation.message };
    }
    
    // Validate options
    const optionsValidation = validateOptions(rawOptions);
    if (!optionsValidation.isValid) {
      return { error: optionsValidation.message };
    }
    
    // Use sanitized options
    const options = optionsValidation.sanitizedOptions || [];

    // Get user from session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (userError) {
      logSecurityEvent('create_poll_error', false, { 
        details: `Authentication error: ${userError.message}` 
      });
      return { error: "Authentication error. Please try again." };
    }
    
    if (!user) {
      logSecurityEvent('create_poll_unauthorized', false, { 
        details: 'Attempt to create poll without authentication' 
      });
      return { error: "You must be logged in to create a poll." };
    }
    
    // Check rate limiting
    if (!await checkPollActionRateLimit(user.id, 'createPoll')) {
      await logSecurityEvent('create_poll_rate_limited', false, { 
        userId: user.id, 
        details: 'Rate limit exceeded for poll creation' 
      });
      return { error: "You're creating polls too quickly. Please try again later." };
    }

    const { error, data } = await supabase.from("polls").insert([
      {
        user_id: user.id,
        question,
        options,
      },
    ]).select('id').single();

    if (error) {
      logSecurityEvent('create_poll_error', false, { 
        userId: user.id, 
        details: `Database error: ${error.message}` 
      });
      return { error: "Failed to create poll. Please try again." };
    }

    // Log successful poll creation
    logSecurityEvent('create_poll_success', true, { 
      userId: user.id, 
      pollId: data?.id,
      details: `Poll created successfully` 
    });

    revalidatePath("/polls");
    return { error: null };
  } catch (err) {
    console.error('Unhandled error in createPoll:', err);
    logSecurityEvent('create_poll_error', false, { 
      details: `Unhandled error: ${err instanceof Error ? err.message : String(err)}` 
    });
    return { error: "An unexpected error occurred. Please try again." };
  }
}

// GET USER POLLS
export async function getUserPolls() {
  try {
    const supabase = await createClient();
    
    // Get user from session
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    
    if (userError) {
      logSecurityEvent('get_user_polls_error', false, { 
        details: `Authentication error: ${userError.message}` 
      });
      return { polls: [], error: "Authentication error. Please try again." };
    }
    
    if (!user) {
      logSecurityEvent('get_user_polls_unauthorized', false, { 
        details: 'Attempt to fetch polls without authentication' 
      });
      return { polls: [], error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logSecurityEvent('get_user_polls_error', false, { 
        userId: user.id,
        details: `Database error: ${error.message}` 
      });
      return { polls: [], error: "Failed to retrieve polls. Please try again." };
    }
    
    return { polls: data ?? [], error: null };
  } catch (err) {
    console.error('Unhandled error in getUserPolls:', err);
    logSecurityEvent('get_user_polls_error', false, { 
      details: `Unhandled error: ${err instanceof Error ? err.message : String(err)}` 
    });
    return { polls: [], error: "An unexpected error occurred. Please try again." };
  }
}

// GET POLL BY ID
export async function getPollById(id: string) {
  try {
    // Validate poll ID format
    if (!validatePollId(id)) {
      logSecurityEvent('get_poll_by_id_error', false, { 
        details: `Invalid poll ID format: ${id}` 
      });
      return { poll: null, error: "Invalid poll ID" };
    }

    const supabase = await createClient();
    
    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("polls")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      // Don't expose detailed database errors to the client
      if (error.code === 'PGRST116') {
        // Record not found error
        logSecurityEvent('get_poll_by_id_not_found', false, { 
          pollId: id,
          userId: user?.id,
          details: `Poll not found: ${id}` 
        });
        return { poll: null, error: "Poll not found" };
      } else {
        logSecurityEvent('get_poll_by_id_error', false, { 
          pollId: id,
          userId: user?.id,
          details: `Database error: ${error.message}` 
        });
        return { poll: null, error: "Failed to retrieve poll. Please try again." };
      }
    }
    
    return { poll: data, error: null };
  } catch (err) {
    console.error('Unhandled error in getPollById:', err);
    logSecurityEvent('get_poll_by_id_error', false, { 
      details: `Unhandled error: ${err instanceof Error ? err.message : String(err)}`,
      pollId: id 
    });
    return { poll: null, error: "An unexpected error occurred. Please try again." };
  }
}

// SUBMIT VOTE
export async function submitVote(pollId: string, optionIndex: number) {
  try {
    // Validate poll ID format
    if (!validatePollId(pollId)) {
      logSecurityEvent('submit_vote_error', false, { 
        pollId,
        details: `Invalid poll ID format: ${pollId}` 
      });
      return { error: "Invalid poll ID" };
    }

    // Validate option index is a number
    if (typeof optionIndex !== 'number' || isNaN(optionIndex) || optionIndex < 0) {
      logSecurityEvent('submit_vote_error', false, { 
        pollId,
        details: `Invalid option index: ${optionIndex}` 
      });
      return { error: "Invalid option selected" };
    }

    const supabase = await createClient();
    
    // Get current user (if logged in)
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      logSecurityEvent('submit_vote_error', false, { 
        pollId,
        details: `Authentication error: ${userError.message}` 
      });
      // Continue as anonymous if there's an auth error but don't expose the error
    }

    // Validate the option index is valid for this poll
    const optionValidation = await validateOptionIndex(pollId, optionIndex, supabase);
    if (!optionValidation.isValid) {
      logSecurityEvent('submit_vote_error', false, { 
        pollId,
        userId: user?.id,
        details: optionValidation.message 
      });
      return { error: optionValidation.message };
    }

    // If user is logged in, check if they've already voted
    if (user) {
      const alreadyVoted = await hasUserVoted(pollId, user.id, supabase);
      if (alreadyVoted) {
        logSecurityEvent('submit_vote_duplicate', false, { 
          pollId,
          userId: user.id,
          details: 'User attempted to vote multiple times' 
        });
        return { error: "You have already voted on this poll" };
      }
      
      // Check rate limiting for logged-in users
      if (!await checkPollActionRateLimit(user.id, 'votePoll')) {
        await logSecurityEvent('submit_vote_rate_limited', false, { 
          pollId,
          userId: user.id, 
          details: 'Rate limit exceeded for voting' 
        });
        return { error: "You're voting too quickly. Please try again later." };
      }
    }

    // IP-based tracking could be implemented here for anonymous votes
    // This would require additional server-side middleware to capture IP addresses

    const { error } = await supabase.from("votes").insert([
      {
        poll_id: pollId,
        user_id: user?.id ?? null,
        option_index: optionIndex,
      },
    ]);

    if (error) {
      logSecurityEvent('submit_vote_error', false, { 
        pollId,
        userId: user?.id,
        details: `Database error: ${error.message}` 
      });
      return { error: "Failed to submit vote. Please try again." };
    }

    // Log successful vote
    logSecurityEvent('submit_vote_success', true, { 
      pollId,
      userId: user?.id,
      details: `Vote submitted successfully for option ${optionIndex}` 
    });
    
    return { error: null };
  } catch (err) {
    console.error('Unhandled error in submitVote:', err);
    logSecurityEvent('submit_vote_error', false, { 
      pollId,
      details: `Unhandled error: ${err instanceof Error ? err.message : String(err)}` 
    });
    return { error: "An unexpected error occurred. Please try again." };
  }
}

// DELETE POLL
export async function deletePoll(id: string) {
  try {
    // Validate poll ID format
    if (!validatePollId(id)) {
      logSecurityEvent('delete_poll_error', false, { 
        pollId: id,
        details: `Invalid poll ID format: ${id}` 
      });
      return { error: "Invalid poll ID" };
    }

    const supabase = await createClient();
    
    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    
    if (userError || !user) {
      logSecurityEvent('delete_poll_unauthorized', false, { 
        pollId: id,
        details: userError ? `Authentication error: ${userError.message}` : 'Not authenticated' 
      });
      return { error: "You must be logged in to delete a poll." };
    }
    
    // Check rate limiting
    if (!await checkPollActionRateLimit(user.id, 'deletePoll')) {
      await logSecurityEvent('delete_poll_rate_limited', false, { 
        pollId: id,
        userId: user.id, 
        details: 'Rate limit exceeded for poll deletion' 
      });
      return { error: "You're deleting polls too quickly. Please try again later." };
    }
    
    // Check if user owns the poll before deleting
    const isOwner = await userOwnsPoll(id, user.id, supabase);
    if (!isOwner) {
      logSecurityEvent('delete_poll_unauthorized', false, { 
        pollId: id,
        userId: user.id,
        details: 'User attempted to delete poll they do not own' 
      });
      return { error: "You can only delete your own polls." };
    }

    const { error } = await supabase.from("polls").delete().eq("id", id);
    
    if (error) {
      logSecurityEvent('delete_poll_error', false, { 
        pollId: id,
        userId: user.id,
        details: `Database error: ${error.message}` 
      });
      return { error: "Failed to delete poll. Please try again." };
    }

    // Log successful deletion
    logSecurityEvent('delete_poll_success', true, { 
      pollId: id,
      userId: user.id,
      details: 'Poll deleted successfully' 
    });

    revalidatePath("/polls");
    return { error: null };
  } catch (err) {
    console.error('Unhandled error in deletePoll:', err);
    logSecurityEvent('delete_poll_error', false, { 
      pollId: id,
      details: `Unhandled error: ${err instanceof Error ? err.message : String(err)}` 
    });
    return { error: "An unexpected error occurred. Please try again." };
  }
}

// UPDATE POLL
export async function updatePoll(pollId: string, formData: FormData) {
  try {
    // Validate poll ID format
    if (!validatePollId(pollId)) {
      logSecurityEvent('update_poll_error', false, { 
        pollId,
        details: `Invalid poll ID format: ${pollId}` 
      });
      return { error: "Invalid poll ID" };
    }

    const supabase = await createClient();

    // Get and sanitize input
    const rawQuestion = formData.get("question") as string;
    const rawOptions = formData.getAll("options").filter(Boolean) as string[];
    
    // Sanitize the question
    const question = sanitizeText(rawQuestion);
    
    // Validate question
    const questionValidation = validateQuestion(question);
    if (!questionValidation.isValid) {
      return { error: questionValidation.message };
    }
    
    // Validate options
    const optionsValidation = validateOptions(rawOptions);
    if (!optionsValidation.isValid) {
      return { error: optionsValidation.message };
    }
    
    // Use sanitized options
    const options = optionsValidation.sanitizedOptions || [];

    // Get user from session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    
    if (userError) {
      logSecurityEvent('update_poll_error', false, { 
        pollId,
        details: `Authentication error: ${userError.message}` 
      });
      return { error: "Authentication error. Please try again." };
    }
    
    if (!user) {
      logSecurityEvent('update_poll_unauthorized', false, { 
        pollId,
        details: 'Attempt to update poll without authentication' 
      });
      return { error: "You must be logged in to update a poll." };
    }
    
    // Check rate limiting
    if (!await checkPollActionRateLimit(user.id, 'createPoll')) {  // We can reuse createPoll rate limit
      await logSecurityEvent('update_poll_rate_limited', false, { 
        pollId,
        userId: user.id, 
        details: 'Rate limit exceeded for poll updates' 
      });
      return { error: "You're updating polls too quickly. Please try again later." };
    }
    
    // Check if user owns the poll before updating
    const isOwner = await userOwnsPoll(pollId, user.id, supabase);
    if (!isOwner) {
      logSecurityEvent('update_poll_unauthorized', false, { 
        pollId,
        userId: user.id,
        details: 'User attempted to update poll they do not own' 
      });
      return { error: "You can only update your own polls." };
    }

    // Only allow updating polls owned by the user
    const { error } = await supabase
      .from("polls")
      .update({ question, options })
      .eq("id", pollId)
      .eq("user_id", user.id);

    if (error) {
      logSecurityEvent('update_poll_error', false, { 
        pollId,
        userId: user.id,
        details: `Database error: ${error.message}` 
      });
      return { error: "Failed to update poll. Please try again." };
    }

    // Log successful update
    logSecurityEvent('update_poll_success', true, { 
      pollId,
      userId: user.id,
      details: 'Poll updated successfully' 
    });

    return { error: null };
  } catch (err) {
    console.error('Unhandled error in updatePoll:', err);
    logSecurityEvent('update_poll_error', false, { 
      pollId,
      details: `Unhandled error: ${err instanceof Error ? err.message : String(err)}` 
    });
    return { error: "An unexpected error occurred. Please try again." };
  }
}
