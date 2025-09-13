import { getPollById } from '@/app/lib/actions/poll-actions';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { verifyPollOwnership } from '@/app/lib/utils/poll-authorization';
import { validatePollId as isValidPollId } from '@/app/lib/utils/poll-validation-server';

// Import the secure client component
import SecureEditPollForm from './SecureEditPollForm';

export default async function EditPollPage({ params }: { params: { id: string } }) {
  // Validate poll ID format first
  if (!params.id || !(await isValidPollId(params.id))) {
    redirect('/polls');
  }
  
  // Get current user session
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // Redirect if not logged in
  if (!session || !session.user) {
    redirect('/login?message=You+must+be+logged+in&redirectTo=/polls/' + params.id + '/edit');
  }
  
  // Get poll data
  const { poll, error } = await getPollById(params.id);

  // Handle not found or errors
  if (error || !poll) {
    notFound();
  }
  
  // Verify ownership (server-side check)
  const isOwner = await verifyPollOwnership(params.id, session.user.id);
  
  // Redirect if not the owner
  if (!isOwner) {
    redirect('/polls?message=You+do+not+have+permission+to+edit+this+poll');
  }
  
  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Poll</h1>
      <SecureEditPollForm poll={poll} />
    </div>
  );
}