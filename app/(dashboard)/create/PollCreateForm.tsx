"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPoll } from "@/app/lib/actions/poll-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeText } from "@/app/lib/utils/share-security";
import { generateCSRFToken, validateCSRFToken } from "@/app/lib/utils/security-client";

export default function PollCreateForm() {
  const router = useRouter();
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [title, setTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [csrfToken, setCsrfToken] = useState<string>("");
  
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

  const addOption = () => {
    // Prevent adding too many options
    if (options.length >= MAX_OPTIONS) {
      setError(`Maximum ${MAX_OPTIONS} options allowed`);
      return;
    }
    setOptions((opts) => [...opts, ""]);
    setError(null);
  };
  
  const removeOption = (idx: number) => {
    if (options.length > MIN_OPTIONS) {
      setOptions((opts) => opts.filter((_, i) => i !== idx));
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

  return (
    <form
      action={handleSubmit}
      className="space-y-6 max-w-md mx-auto"
    >
      {/* Hidden CSRF token field */}
      <input type="hidden" name="csrfToken" value={csrfToken} />
      
      <div>
        <Label htmlFor="question">Poll Title</Label>
        <Input 
          name="question" 
          id="question"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
          disabled={loading}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="Enter your poll title here"
        />
        <p className="text-xs text-gray-500 mt-1">
          {title.length}/{MAX_QUESTION_LENGTH} characters
        </p>
      </div>
      
      <div>
        <Label>Options</Label>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <Input
              name="options"
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              required
              disabled={loading}
              maxLength={MAX_OPTION_LENGTH}
            />
            {options.length > MIN_OPTIONS && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => removeOption(idx)}
                disabled={loading}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button 
            type="button" 
            onClick={addOption} 
            variant="secondary"
            disabled={loading || options.length >= MAX_OPTIONS}
          >
            Add Option
          </Button>
          <p className="text-xs text-gray-500">
            {options.filter(o => o.trim()).length}/{MAX_OPTIONS} options
          </p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-md text-sm">
          Poll created! Redirecting...
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={loading}
        className="w-full"
      >
        {loading ? "Creating..." : "Create Poll"}
      </Button>
    </form>
  );
} 