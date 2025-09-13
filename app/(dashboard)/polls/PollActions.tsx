"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/app/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { deletePoll } from "@/app/lib/actions/poll-actions";
import { AlertCircle } from "lucide-react";
import { isValidPollId, sanitizeText } from "@/app/lib/utils/share-security";

// Strong typing for poll data
interface PollOption {
  id: string;
  text: string;
  poll_id: string;
  order_index: number;
  vote_count?: number;
}

interface Poll {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  is_active: boolean;
  allow_multiple_choices: boolean;
  options: PollOption[];
}

interface PollActionsProps {
  poll: Poll;
}

/**
 * Poll Actions Component
 * 
 * Provides management controls and actions for individual polls.
 * This component is essential to the poll management experience as it:
 * 1. Enables poll creators to manage their content through a unified interface
 * 2. Implements proper authorization checks before allowing actions
 * 3. Provides secure deletion capabilities with confirmation
 * 4. Handles error states and user feedback for management operations
 * 
 * Used in: Poll detail pages, management interfaces, and anywhere users
 * need to perform CRUD operations on polls they own. This component
 * represents the primary control surface for poll management.
 * 
 * @param {Object} props - Component properties
 * @param {Poll} props.poll - The poll object to render actions for
 */
export default function PollActions({ poll }: PollActionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Validate poll ID for security to prevent ID-based attacks
  const isValidId = poll && poll.id && isValidPollId(poll.id);
  
  // Check if user is authorized to modify this poll
  const isAuthorized = user && poll && user.id === poll.creator_id;
  
  /**
   * Poll Deletion Handler
   * 
   * Manages the secure deletion process for a poll with validation and confirmation.
   * This function is critical to content management as it:
   * 1. Implements client-side security checks before deletion
   * 2. Enforces proper authorization for destructive operations
   * 3. Provides user confirmation to prevent accidental deletions
   * 4. Handles the complete deletion flow with proper error management
   * 
   * Used when a user clicks the delete button for a poll they own,
   * this function coordinates the deletion server action and UI feedback.
   */
  const handleDelete = async () => {
    // Reset error state before new operation
    setError(null);
    
    // Check for valid ID to prevent malformed requests
    if (!isValidId) {
      setError("Invalid poll ID format");
      return;
    }
    
    // Verify user authorization to prevent unauthorized deletions
    if (!isAuthorized) {
      setError("You don't have permission to delete this poll");
      return;
    }
    
    // Confirm action
    if (confirm("Are you sure you want to delete this poll?")) {
      try {
        setIsDeleting(true);
        const result = await deletePoll(poll.id);
        
        if (result.error) {
          setError(result.error);
          setIsDeleting(false);
        } else {
          // Use Next.js router for navigation
          router.refresh(); // Refresh the current page data
        }
      } catch (err) {
        console.error("Error deleting poll:", err);
        setError("Failed to delete poll");
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="border rounded-md shadow-md hover:shadow-lg transition-shadow bg-white">
      {/* Show error if any */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-600 px-3 py-2 text-sm flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Only generate link if poll ID is valid */}
      {isValidId ? (
        <Link href={`/polls/${poll.id}`}>
          <div className="group p-4">
            <div className="h-full">
              <div>
                <h2 className="group-hover:text-blue-600 transition-colors font-bold text-lg">
                  {/* Sanitize title text to prevent XSS */}
                  {sanitizeText(poll.title)}
                </h2>
                <p className="text-slate-500">
                  {Array.isArray(poll.options) ? poll.options.length : 0} options
                </p>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="p-4">
          <div className="text-red-500">Invalid poll data</div>
        </div>
      )}
      
      {/* Only show actions to authorized users */}
      {isAuthorized && (
        <div className="flex gap-2 p-2">
          <Button 
            asChild 
            variant="outline" 
            size="sm" 
            disabled={!isValidId}
          >
            <Link href={`/polls/${poll.id}/edit`}>Edit</Link>
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDelete} 
            disabled={isDeleting || !isValidId}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      )}
    </div>
  );
}
