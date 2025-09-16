"use client";

import React from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordStrengthResult {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    common: boolean;
  };
}

/**
 * Password Strength Indicator Component
 * 
 * Provides real-time feedback on password strength according to the 
 * authentication architecture guidelines. This component helps users
 * create secure passwords by showing strength levels and specific
 * requirements that need to be met.
 */
export function PasswordStrengthIndicator({ 
  password, 
  className = "" 
}: PasswordStrengthIndicatorProps) {
  const strengthResult = calculatePasswordStrength(password);
  
  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStrengthText = (score: number) => {
    switch (score) {
      case 0:
        return 'Very Weak';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  };

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength Bar */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strengthResult.score)}`}
            style={{ width: `${(strengthResult.score / 4) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${
          strengthResult.score >= 3 ? 'text-green-600' : 
          strengthResult.score >= 2 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {getStrengthText(strengthResult.score)}
        </span>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1">
        <RequirementItem 
          met={strengthResult.requirements.length}
          text="At least 8 characters"
        />
        <RequirementItem 
          met={strengthResult.requirements.uppercase}
          text="At least one uppercase letter"
        />
        <RequirementItem 
          met={strengthResult.requirements.lowercase}
          text="At least one lowercase letter"
        />
        <RequirementItem 
          met={strengthResult.requirements.number}
          text="At least one number"
        />
        <RequirementItem 
          met={strengthResult.requirements.special}
          text="At least one special character"
        />
        <RequirementItem 
          met={strengthResult.requirements.common}
          text="Not a commonly used password"
        />
      </div>

      {/* Feedback Messages */}
      {strengthResult.feedback.length > 0 && (
        <div className="space-y-1">
          {strengthResult.feedback.map((message, index) => (
            <p key={index} className="text-xs text-amber-600">
              💡 {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual requirement item component
 */
function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center space-x-2 text-xs ${
      met ? 'text-green-600' : 'text-gray-500'
    }`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
        met ? 'bg-green-100' : 'bg-gray-100'
      }`}>
        {met ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className="w-2 h-2 bg-gray-400 rounded-full" />
        )}
      </span>
      <span>{text}</span>
    </div>
  );
}

/**
 * Calculate password strength and provide requirements feedback
 */
function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    common: !isCommonPassword(password)
  };

  // Calculate base score from requirements
  const metRequirements = Object.values(requirements).filter(Boolean).length;
  let score = Math.floor((metRequirements / 6) * 4);

  // Bonus points for length
  if (password.length >= 12) {
    score = Math.min(4, score + 1);
  }

  // Penalty for very short passwords
  if (password.length < 6) {
    score = Math.max(0, score - 1);
  }

  // Generate feedback
  const feedback: string[] = [];
  
  if (password.length < 12) {
    feedback.push("Consider using 12 or more characters for better security");
  }
  
  if (!/[A-Z].*[A-Z]/.test(password) && requirements.uppercase) {
    feedback.push("Multiple uppercase letters increase security");
  }
  
  if (!/[0-9].*[0-9]/.test(password) && requirements.number) {
    feedback.push("Multiple numbers make passwords harder to guess");
  }
  
  if (!requirements.common) {
    feedback.push("Avoid common passwords like 'password123' or 'qwerty'");
  }

  return {
    score,
    feedback,
    requirements
  };
}

/**
 * Check if password is commonly used (simplified list)
 * In production, this would use a more comprehensive list
 */
function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password', 'password123', '123456', '12345678', 'qwerty',
    'abc123', 'letmein', 'welcome', 'admin', 'superman', 'iloveyou',
    '1234567890', 'password1', 'welcome123', 'admin123'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
}