"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPoll } from "@/app/lib/actions/poll-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeText } from "@/app/lib/utils/share-security";
import { generateCSRFToken, validateCSRFToken } from "@/app/lib/utils/security-client";

/**
 * Poll Creation Form Component
 * 
 * An accessible form component that allows users to create new polls.
 * This component implements WCAG 2.1 accessibility guidelines to ensure 
 * that all users, including those with disabilities, can create polls.
 */
export default function PollCreateForm() {
  const router = useRouter();
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [csrfToken, setCsrfToken] = useState<string>("");
  // For focus management
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  
  // Constants for validation
  const MAX_QUESTION_LENGTH = 500;
  const MAX_OPTION_LENGTH = 200;
  const MAX_OPTIONS = 10;
  const MIN_OPTIONS = 2;
  
  // Generate CSRF token on component mount
  useEffect(() => {
    const token = generateCSRFToken();
    setCsrfToken(token);
    sessionStorage.setItem("pollCreateCsrfToken", token);
    
    // Add keyboard interaction instructions to the page
    const handleKeyDown = (e: KeyboardEvent) => {
      // Provide help text when user presses ? or h key
      if (e.key === '?' || e.key === 'h') {
        alert('Keyboard shortcuts: Use Tab to navigate, Enter to submit, Escape to cancel. ' + 
              'Use Alt+A to add a new option and Alt+R to remove the last option.');
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTitleChange = (value: string) => {
    // Sanitize and limit length
    const sanitized = sanitizeText(value).slice(0, MAX_QUESTION_LENGTH);
    setTitle(sanitized);
  };

  const handleOptionChange = (idx: number, value: string) => {
    // Sanitize and limit length
    const sanitized = sanitizeText(value).slice(0, MAX_OPTION_LENGTH);
    setOptions((opts) => opts.map((opt, i) => (i === idx ? sanitized : opt)));
  };

  /**
   * Add a new option to the poll
   * Updates focus to the newly added option for better keyboard navigation
   */
  const addOption = () => {
    // Prevent adding too many options
    if (options.length >= MAX_OPTIONS) {
      setError(`Maximum ${MAX_OPTIONS} options allowed`);
      return;
    }
    setOptions((opts) => [...opts, ""]);
    setError(null);
    
    // Set focus to the new option in the next render cycle
    setTimeout(() => {
      setFocusIndex(options.length);
    }, 0);
  };
  
  /**
   * Remove an option from the poll
   * Maintains focus on the next available option for better keyboard navigation
   * @param idx - Index of the option to remove
   */
  const removeOption = (idx: number) => {
    if (options.length > MIN_OPTIONS) {
      setOptions((opts) => opts.filter((_, i) => i !== idx));
      
      // Update focus to prevent focus being lost after deletion
      if (idx === options.length - 1) {
        setFocusIndex(idx - 1);
      } else {
        setFocusIndex(idx);
      }
    }
  };
  
  /**
   * Handle keyboard shortcuts for accessibility
   * @param e - Keyboard event
   */
  const handleKeyboardShortcuts = (e: React.KeyboardEvent) => {
    // Alt+A to add new option
    if (e.altKey && e.key === 'a') {
      e.preventDefault();
      addOption();
    }
    
    // Alt+R to remove the last option
    if (e.altKey && e.key === 'r' && options.length > MIN_OPTIONS) {
      e.preventDefault();
      removeOption(options.length - 1);
    }
  };
  
  // Client-side validation before submission
  const validateForm = () => {
    // Validate title
    if (!title || title.trim().length === 0) {
      setError("Title is required");
      return false;
    }
    
    if (title.length > MAX_QUESTION_LENGTH) {
      setError(`Title must be ${MAX_QUESTION_LENGTH} characters or less`);
      return false;
    }
    
    // Filter out empty options
    const filteredOptions = options.filter(opt => opt && opt.trim().length > 0);
    
    // Validate options
    if (filteredOptions.length < MIN_OPTIONS) {
      setError(`Please provide at least ${MIN_OPTIONS} options`);
      return false;
    }
    
    if (filteredOptions.length > MAX_OPTIONS) {
      setError(`Maximum ${MAX_OPTIONS} options allowed`);
      return false;
    }
    
    // Check for duplicate options
    const optionsSet = new Set(filteredOptions.map(opt => opt.toLowerCase().trim()));
    if (optionsSet.size !== filteredOptions.length) {
      setError("All options must be unique");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      // Reset states
      setError(null);
      setSuccess(false);
      
      // Prevent submission while loading
      if (loading) return;
      setLoading(true);
      
      // Validate CSRF token
      const submittedToken = formData.get("csrfToken") as string;
      const storedToken = sessionStorage.getItem("pollCreateCsrfToken") || "";
      
      if (!validateCSRFToken(submittedToken, storedToken)) {
        setError("Security verification failed. Please refresh the page.");
        setLoading(false);
        return;
      }
      
      // Validate form before submission
      if (!validateForm()) {
        setLoading(false);
        return;
      }
      
      // Prepare sanitized data for submission
      const secureFormData = new FormData();
            secureFormData.set("question", sanitizeText(title));
      
      // Filter out empty options and sanitize
      const filteredOptions = options.filter(opt => opt && opt.trim().length > 0);
      filteredOptions.forEach(opt => secureFormData.append("options", sanitizeText(opt)));
      
      // Submit the form
      const res = await createPoll(secureFormData);
      
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        // Generate new CSRF token after successful submission
        const newToken = generateCSRFToken();
        setCsrfToken(newToken);
        sessionStorage.setItem("pollCreateCsrfToken", newToken);
        
        // Use router for safe navigation
        setTimeout(() => {
          router.push("/polls");
          router.refresh();
        }, 1200);
      }
    } catch (err) {
      console.error("Error creating poll:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Effect for managing focus when focusIndex changes
  useEffect(() => {
    if (focusIndex >= 0 && focusIndex < options.length) {
      const optionInputs = document.querySelectorAll('input[name="options"]');
      if (optionInputs[focusIndex]) {
        (optionInputs[focusIndex] as HTMLInputElement).focus();
      }
    }
  }, [focusIndex, options.length]);

  return (
    <div onKeyDown={handleKeyboardShortcuts} className="space-y-6 max-w-md mx-auto">
      {/* Accessible instructions */}
      <div className="sr-only" aria-live="polite">
        Press question mark for keyboard shortcuts. Use tab to navigate form elements.
      </div>
      
      <form
        action={handleSubmit}
        className="space-y-6"
        aria-labelledby="poll-form-title"
      >
        <h2 id="poll-form-title" className="text-2xl font-bold text-center mb-6">
          Create New Poll
        </h2>
        
        {/* Hidden CSRF token field */}
        <input type="hidden" name="csrfToken" value={csrfToken} />
        
        <div>
          <Label htmlFor="question" className="block mb-2">Poll Title</Label>
          <Input 
            name="question" 
            id="question"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            disabled={loading}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="Enter your poll title here"
            aria-describedby="question-hint"
            aria-invalid={error && error.includes("Title") ? "true" : "false"}
          />
          <p id="question-hint" className="text-xs text-gray-500 mt-1">
            {title.length}/{MAX_QUESTION_LENGTH} characters
          </p>
        </div>
        
        <fieldset>
          <legend className="block mb-2 font-semibold">
            Poll Options <span className="text-red-500" aria-hidden="true">*</span>
          </legend>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                  <Label htmlFor={`option-${idx}`} className="sr-only">Option {idx + 1}</Label>
                  <Input
                    id={`option-${idx}`}
                    name="options"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    required={idx < MIN_OPTIONS}
                    disabled={loading}
                    maxLength={MAX_OPTION_LENGTH}
                    placeholder={`Option ${idx + 1}`}
                    aria-label={`Option ${idx + 1}`}
                    ref={el => {
                      if (focusIndex === idx && el) {
                        el.focus();
                      }
                    }}
                  />
                </div>
                {options.length > MIN_OPTIONS && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={() => removeOption(idx)}
                    disabled={loading}
                    aria-label={`Remove option ${idx + 1}`}
                  >
                    <span aria-hidden="true">Remove</span>
                    <span className="sr-only">Remove option {idx + 1}</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <Button 
              type="button" 
              onClick={addOption} 
              variant="secondary"
              disabled={loading || options.length >= MAX_OPTIONS}
              aria-keyshortcuts="Alt+a"
              aria-describedby="option-limit-info"
            >
              <span aria-hidden="true">Add Option</span>
              <span className="sr-only">Add new option (Alt+A)</span>
            </Button>
            <p id="option-limit-info" className="text-xs text-gray-500">
              {options.filter(o => o.trim()).length}/{MAX_OPTIONS} options
            </p>
          </div>
        </fieldset>
        
        {/* Keyboard shortcuts help text */}
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
          <p className="font-medium mb-1">Keyboard shortcuts:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Press <kbd className="px-1 py-0.5 bg-gray-200 rounded">?</kbd> for help</li>
            <li><kbd className="px-1 py-0.5 bg-gray-200 rounded">Alt+A</kbd> to add option</li>
            <li><kbd className="px-1 py-0.5 bg-gray-200 rounded">Alt+R</kbd> to remove last option</li>
          </ul>
        </div>
        
        {/* Error message with proper ARIA attributes */}
        {error && (
          <div 
            className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm"
            role="alert"
            aria-live="assertive"
          >
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {/* Success message with proper ARIA attributes */}
        {success && (
          <div 
            className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-md text-sm"
            role="status"
            aria-live="polite"
          >
            Poll created! Redirecting...
          </div>
        )}
        
        <Button 
          type="submit" 
          disabled={loading}
          className="w-full"
          aria-busy={loading ? "true" : "false"}
        >
          {loading ? "Creating..." : "Create Poll"}
        </Button>
      </form>
    </div>
  );
}