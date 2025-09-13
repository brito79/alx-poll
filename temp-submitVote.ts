// Improved submitVote function that handles the new database schema

export async function submitVote(pollId: string, optionId: string) {
  try {
    // Validate poll ID format
    if (!validatePollId(pollId)) {
      logSecurityEvent('submit_vote_error', false, { 
        pollId,
        details: `Invalid poll ID format: ${pollId}` 
      });
      return { error: "Invalid poll ID" };
    }

    // Validate option ID format
    if (!validatePollId(optionId)) {
      logSecurityEvent('submit_vote_error', false, { 
        pollId,
        details: `Invalid option ID format: ${optionId}` 
      });
      return { error: "Invalid option ID" };
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

    // Validate the option belongs to this poll
    const optionValidation = await validatePollOption(pollId, optionId, supabase);
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
        return { error: "You're voting too quickly. Please try again." };
      }
    }

    // Insert vote into database
    const { error } = await supabase.from("votes").insert([
      {
        poll_id: pollId,
        option_id: optionId,
        user_id: user?.id ?? null,
        // IP address and user agent would be handled by server middleware
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
      details: `Vote submitted successfully for option ${optionId}` 
    });
    
    revalidatePath(`/polls/${pollId}`);
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
