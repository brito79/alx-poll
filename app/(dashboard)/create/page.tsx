import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import PollCreateForm from "./PollCreateForm";

// Server component to check authentication status
export default async function CreatePollPage() {
  // Get current user session
  const cookieStore = cookies();
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // Redirect if not logged in
  if (!session || !session.user) {
    redirect('/login?message=You+must+be+logged+in+to+create+polls&redirectTo=/create');
  }
  
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Create a New Poll</h1>
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
        <p>
          <strong>Security Note:</strong> Poll questions and options will be publicly visible. 
          Do not include sensitive personal information.
        </p>
      </div>
      <PollCreateForm />
    </main>
  );
}