// User types
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Poll types
export interface PollOption {
  id: string;
  text: string;
  poll_id: string;
  order_index: number;
  vote_count?: number;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  is_active: boolean;
  allow_multiple_choices: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  options?: PollOption[];
  total_votes?: number;
}

// Vote types
export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  userId?: string; // Optional if anonymous voting is allowed
  createdAt: Date;
}

// Form types
export interface CreatePollFormData {
  title: string;
  description?: string;
  options: string[];
  allow_multiple_choices?: boolean;
  expires_at?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
}