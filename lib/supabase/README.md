# Database Setup for Polly App

This directory contains the SQL migration files needed to set up your Supabase database for the Polly polling application.

## Quick Setup

### Option 1: Run in Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Go to the **SQL Editor**
4. Copy and paste each migration file in order:
   - `001_initial_schema.sql` - Creates tables and basic structure
   - `002_rls_policies.sql` - Sets up Row Level Security policies
   - `003_views_and_functions.sql` - Creates helpful views and functions

### Option 2: Using Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Database Schema Overview

### Tables Created

1. **profiles** - Extended user information (linked to auth.users)
   - Stores user profile data like username, full name, avatar
   - Automatically created when users sign up

2. **polls** - Main polls table
   - Stores poll metadata like title, description, settings
   - Links to creator via creator_id

3. **poll_options** - Individual options for each poll
   - Stores the text and order for each poll choice
   - Links to polls via poll_id

4. **votes** - Records of user votes
   - Supports both authenticated and anonymous voting
   - Prevents duplicate votes per user/poll

### Key Features

- **Row Level Security (RLS)** - Ensures users can only modify their own data
- **Automatic timestamps** - Created/updated timestamps on relevant tables
- **Vote counting** - Efficient views and functions for poll statistics
- **Anonymous voting** - Support for non-authenticated users (IP-based)
- **Flexible voting** - Support for single or multiple choice polls

### Views and Functions

- `poll_results` - View with vote counts and statistics
- `get_poll_with_results(uuid)` - Function to get complete poll data
- `user_has_voted(uuid, uuid)` - Check if user voted on a poll
- `get_user_votes(uuid, uuid)` - Get user's votes for a specific poll

## Environment Variables

Make sure your `.env.local` file has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing the Database

After running the migrations, you can test the setup by:

1. Creating a user account in your app
2. Creating a poll
3. Voting on the poll
4. Checking the data in your Supabase dashboard

## Security Notes

- All tables have Row Level Security enabled
- Users can only modify their own profiles and polls
- Anyone can view polls and vote (configurable)
- Vote integrity is maintained through unique constraints
- Anonymous votes are tracked by IP address

## Troubleshooting

If you encounter issues:

1. Check that all migrations ran successfully
2. Verify RLS policies are active
3. Ensure your environment variables are correct
4. Check the Supabase logs for any errors

For more help, refer to the [Supabase documentation](https://supabase.com/docs).
