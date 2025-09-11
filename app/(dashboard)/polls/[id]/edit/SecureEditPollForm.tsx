'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updatePoll } from '@/app/lib/actions/poll-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/lib/context/auth-context';
import { sanitizeText, isValidPollId } from '@/app/lib/utils/share-security';
import { isPollActionAuthorized } from '@/app/lib/utils/poll-authorization';

interface PollData {
  id: string;
  question: string;
  options: string[];
  user_id: string;
}

export default function EditPollForm({ poll }: { poll: PollData }) {
  const router = useRouter();
  const { user } = useAuth();
  const [question, setQuestion] = useState<string>(poll?.question || '');
  const [options, setOptions] = useState<string[]>(poll?.options || ['', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  
  // Generate CSRF token on mount
  useEffect(() => {
    const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36);
    setCsrfToken(token);
    sessionStorage.setItem('pollEditCsrfToken', token);
  }, []);
  
  // Check authorization and sanitize input data on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Validate poll data exists and has valid ID format
      if (!poll || !poll.id || !isValidPollId(poll.id)) {
        setError('Invalid poll data');
        return;
      }
      
      // Check if user is authorized to edit this poll
      if (!user) {
        setError('You must be logged in to edit polls');
        return;
      }
      
      const authorized = await isPollActionAuthorized('edit', poll.id, user.id);
      setIsAuthorized(authorized);
      
      if (!authorized) {
        setError('You do not have permission to edit this poll');
        return;
      }
      
      // Sanitize question
      setQuestion(sanitizeText(poll.question || ''));
      
      // Sanitize options
      if (Array.isArray(poll.options)) {
        setOptions(poll.options.map((opt: string) => sanitizeText(opt)));
      } else {
        setOptions(['', '']);
      }
    };
    
    checkAuth();
  }, [poll, user]);

  const handleOptionChange = (idx: number, value: string) => {
    setOptions((opts: string[]) => opts.map((opt: string, i: number) => (i === idx ? sanitizeText(value) : opt)));
  };

  const addOption = () => {
    if (options.length >= 10) { // Limit number of options
      setError('Maximum 10 options allowed');
      return;
    }
    setOptions((opts: string[]) => [...opts, '']);
  };
  
  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions((opts: string[]) => opts.filter((_, i: number) => i !== idx));
    }
  };
  
  const handleSubmit = async (formData: FormData) => {
    try {
      // Reset states
      setError(null);
      setSuccess(false);
      setLoading(true);
      
      // Validate CSRF token
      const submittedToken = formData.get('csrfToken') as string;
      const storedToken = sessionStorage.getItem('pollEditCsrfToken');
      
      if (submittedToken !== storedToken || !submittedToken) {
        setError('Security verification failed. Please refresh the page');
        setLoading(false);
        return;
      }
      
      // Check authorization again
      if (!isAuthorized || !user || !poll.id) {
        setError('You do not have permission to update this poll');
        setLoading(false);
        return;
      }
      
      // Validate inputs
      if (!question.trim()) {
        setError('Question is required');
        setLoading(false);
        return;
      }
      
      const filteredOptions = options.filter(opt => opt.trim());
      if (filteredOptions.length < 2) {
        setError('At least two options are required');
        setLoading(false);
        return;
      }
      
      // Prepare form data with sanitized inputs
      const secureFormData = new FormData();
      secureFormData.set('question', sanitizeText(question));
      
      // Clear existing options and add sanitized ones
      filteredOptions.forEach((opt: string) => {
        secureFormData.append('options', sanitizeText(opt));
      });
      
      // Submit the update
      const res = await updatePoll(poll.id, secureFormData);
      
      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        setSuccess(true);
        
        // Use Next.js router instead of direct window location
        setTimeout(() => {
          router.push('/polls');
          router.refresh();
        }, 1200);
      }
    } catch (err) {
      console.error('Poll update error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show error if not authorized
  if (error && !isAuthorized) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md flex items-start">
        <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
        <div>
          <h3 className="font-medium">Access Denied</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-6"
    >
      {/* Hidden CSRF token */}
      <input type="hidden" name="csrfToken" value={csrfToken} />
      
      <div>
        <Label htmlFor="question">Poll Question</Label>
        <Input
          name="question"
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          disabled={!isAuthorized || loading}
          maxLength={500}
        />
      </div>
      
      <div>
        <Label>Options</Label>
        {options.map((opt: string, idx: number) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <Input
              name="options"
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              required
              disabled={!isAuthorized || loading}
              maxLength={200}
            />
            {options.length > 2 && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => removeOption(idx)}
                disabled={!isAuthorized || loading}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button 
          type="button" 
          onClick={addOption} 
          variant="secondary"
          disabled={options.length >= 10 || !isAuthorized || loading}
        >
          Add Option
        </Button>
      </div>
      
      {error && isAuthorized && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-md text-sm">
          Poll updated! Redirecting...
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={!isAuthorized || loading}
      >
        {loading ? 'Updating...' : 'Update Poll'}
      </Button>
    </form>
  );
}
