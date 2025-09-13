/**
 * Admin Panel Component
 * 
 * This component serves as a centralized administrative interface for the ALX-Polly application.
 * It provides system administrators with the ability to:
 * 1. View all polls across the entire system regardless of creator
 * 2. Delete any poll from the system with immediate effect
 * 3. Monitor system usage through poll analytics
 * 
 * The Admin Panel is a critical security boundary in the application that:
 * - Functions as a super-user interface with elevated permissions
 * - Bypasses standard user access controls to allow system-wide management
 * - Provides oversight capabilities for content moderation and policy enforcement
 * 
 * This component interacts directly with:
 * - Supabase client for fetching all polls regardless of ownership
 * - Poll action APIs for poll deletion
 * - Authentication context for admin role verification (via parent layout)
 * 
 * The existence of this panel necessitates careful access control at:
 * 1. UI level (route protected by admin-only middleware)
 * 2. Database level (RLS policies for admin users)
 * 3. Action level (server-side validation of admin permissions)
 * 
 * Access to this component is restricted via the admin role check in the parent
 * dashboard layout, forming a critical part of the application's role-based access
 * control system.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deletePoll } from "@/app/lib/actions/poll-actions";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, Trash2 } from "lucide-react";

/**
 * Poll data interface representing the structure of poll data
 * received from Supabase for admin display.
 * 
 * This interface captures the essential poll attributes needed for
 * administrative functions while maintaining type safety.
 */
interface Poll {
  id: string;            // Unique identifier for the poll
  title: string;         // Poll title (renamed from question in database schema)
  creator_id: string;    // ID of poll creator (renamed from user_id)
  created_at: string;    // Timestamp of creation
  poll_options: { text: string }[]; // Array of poll options with their text
}

/**
 * AdminPage Component
 * 
 * The AdminPage component is the primary administrative interface for the application.
 * It allows administrators to view and manage all polls in the system regardless of 
 * who created them, providing a critical moderation capability.
 * 
 * This component is part of the admin security boundary and relies on:
 * 1. Middleware protection at the route level
 * 2. Admin-role verification at the layout level
 * 3. Special database privileges for admin users via RLS policies
 * 
 * @returns JSX.Element - The rendered admin interface
 */
export default function AdminPage() {
  // State for storing all system polls 
  const [polls, setPolls] = useState<Poll[]>([]);
  // Loading state for initial data fetch
  const [loading, setLoading] = useState(true);
  // Tracks which poll is currently being deleted (if any)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  /**
   * Effect hook to load polls on component mount
   * This initializes the admin view with all system polls
   */
  useEffect(() => {
    fetchAllPolls();
  }, []);

  /**
   * Fetches all polls in the system regardless of creator
   * 
   * This function demonstrates a key administrative capability - the ability
   * to see ALL polls in the system, not just those created by the current user.
   * This is achieved through special admin RLS policies in Supabase that bypass
   * the normal ownership checks that restrict regular users.
   * 
   * This function interacts with the Supabase client to:
   * 1. Query the polls table with no user filtering
   * 2. Join with poll_options to get complete poll data
   * 3. Order by creation date to show newest polls first
   */
  const fetchAllPolls = async () => {
    const supabase = createClient();

    // Admin-privileged fetch of all polls with their options
    const { data, error } = await supabase
      .from("polls")
      .select("*, poll_options(text)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Map the data to the updated Poll interface
      const fetchedPolls = data.map(p => ({
        id: p.id,
        title: p.title,
        creator_id: p.creator_id,
        created_at: p.created_at,
        poll_options: p.poll_options || []
      }));
      setPolls(fetchedPolls);
    }
    setLoading(false);
  };

  /**
   * Handles the deletion of any poll in the system
   * 
   * This function provides administrators with the ability to remove any poll
   * regardless of who created it. This is a powerful moderation capability that:
   * 
   * 1. Allows enforcing content policies by removing inappropriate polls
   * 2. Helps maintain system integrity by removing spam or malicious content
   * 3. Provides a last-resort mechanism for handling user requests
   * 
   * The function uses the server-side deletePoll action, which has special admin
   * permission checks that bypass the normal ownership requirement for deletion.
   * This forms a critical part of the admin security model, with protections at both
   * the UI and server levels.
   * 
   * @param pollId - The unique ID of the poll to delete
   */
  const handleDelete = async (pollId: string) => {
    // Set loading state for this specific poll
    setDeleteLoading(pollId);
    
    // Call the server action with admin context
    const result = await deletePoll(pollId);

    // Update UI if deletion was successful
    if (!result.error) {
      setPolls(polls.filter((poll) => poll.id !== pollId));
    }

    // Reset loading state
    setDeleteLoading(null);
  };

  /**
   * Loading state display while polls are being fetched
   * Provides feedback during the initial admin data load
   */
  if (loading) {
    return <div className="p-6 text-center">Loading all polls...</div>;
  }

  /**
   * Main admin interface rendering
   * 
   * The UI layout is designed to:
   * 1. Clearly identify this as an administrative interface
   * 2. Present all polls in a consistent, scannable format
   * 3. Expose poll metadata needed for administration
   * 4. Provide direct action buttons for moderation tasks
   * 
   * This interface is reserved for users with admin privileges and
   * provides system-wide visibility that regular users don't have.
   */
  return (
    <div className="p-6 space-y-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-gray-500 mt-2">
          View and manage all polls in the system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map((poll) => (
          <Card key={poll.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{poll.title}</CardTitle>
                  <CardDescription>
                    Created: {new Date(poll.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Options:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {poll.poll_options.map((option, index) => (
                    <li key={index}>{option.text}</li>
                  ))}
                </ul>
                 <div className="text-xs text-gray-500 pt-2">
                    <p>Poll ID: <code className="bg-gray-100 p-1 rounded">{poll.id}</code></p>
                    <p>Owner ID: <code className="bg-gray-100 p-1 rounded">{poll.creator_id}</code></p>
                 </div>
              </div>
            </CardContent>
            <CardFooter>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDelete(poll.id)}
                  disabled={deleteLoading === poll.id}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteLoading === poll.id ? "Deleting..." : "Delete Poll"}
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {polls.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No Polls Found</h3>
          <p className="mt-1 text-sm">There are currently no polls in the system.</p>
        </div>
      )}
    </div>
  );
}
