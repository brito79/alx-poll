import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Poll } from '@/app/lib/types';

interface PollCardProps {
  poll: {
    id: string;
    title: string;
    description?: string;
    options: any[];
    votes?: number;
    createdAt: string | Date;
  };
}

/**
 * Poll Card Component
 * 
 * Displays a concise, interactive preview of a poll in a card format.
 * This component is fundamental to the application's browsing experience as it:
 * 1. Creates a consistent, visually appealing representation of polls
 * 2. Provides essential summary information about each poll
 * 3. Serves as a navigation element to the detailed poll view
 * 4. Establishes visual hierarchy for poll listings and grids
 * 
 * Used in: Poll listing pages, user dashboard, and anywhere multiple polls
 * need to be displayed in a grid or list format. This component forms the
 * primary browsing interface for discovering polls.
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.poll - Poll data object with details to display
 */
export function PollCard({ poll }: PollCardProps) {
  // Calculate the total votes for display
  const totalVotes = poll.votes || poll.options.reduce((sum, option) => sum + (option.votes || 0), 0);
  
  // Format the date for consistent display
  const formattedDate = typeof poll.createdAt === 'string' 
    ? new Date(poll.createdAt).toLocaleDateString() 
    : poll.createdAt.toLocaleDateString();

  return (
    <Link href={`/polls/${poll.id}`} className="group block h-full">
      <Card className="h-full transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="group-hover:text-blue-600 transition-colors">{poll.title}</CardTitle>
          {poll.description && <CardDescription>{poll.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">
            <p>{poll.options.length} options</p>
            <p>{totalVotes} total votes</p>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-slate-400">
          Created on {formattedDate}
        </CardFooter>
      </Card>
    </Link>
  );
}