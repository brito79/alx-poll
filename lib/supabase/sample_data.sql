-- Sample data for testing (optional)
-- Run this after the main migrations if you want some test data

-- Note: This assumes you have at least one user created through the auth system
-- Replace the user IDs with actual UUIDs from your auth.users table

-- Sample poll 1: Favorite programming language
DO $$
DECLARE
    poll_id UUID;
    option1_id UUID;
    option2_id UUID;
    option3_id UUID;
    option4_id UUID;
    sample_user_id UUID;
BEGIN
    -- Get a sample user ID (you'll need to replace this with an actual user ID)
    -- SELECT id INTO sample_user_id FROM auth.users LIMIT 1;
    
    -- For now, we'll create a sample poll without votes
    -- You can add votes manually after creating users
    
    -- Insert sample poll
    INSERT INTO public.polls (title, description, creator_id, allow_multiple_choices)
    VALUES (
        'What is your favorite programming language?',
        'Help us understand what programming languages our community prefers!',
        '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
        false
    ) RETURNING id INTO poll_id;
    
    -- Insert poll options
    INSERT INTO public.poll_options (poll_id, text, order_index) VALUES
    (poll_id, 'JavaScript/TypeScript', 1),
    (poll_id, 'Python', 2),
    (poll_id, 'Java', 3),
    (poll_id, 'C#', 4),
    (poll_id, 'Go', 5),
    (poll_id, 'Rust', 6);
    
    RAISE NOTICE 'Sample poll created with ID: %', poll_id;
END $$;

-- Sample poll 2: Best development setup
DO $$
DECLARE
    poll_id UUID;
    sample_user_id UUID;
BEGIN
    -- Insert another sample poll
    INSERT INTO public.polls (title, description, creator_id, allow_multiple_choices)
    VALUES (
        'What is your preferred development setup?',
        'Let us know how you like to set up your development environment.',
        '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
        true  -- Allow multiple choices
    ) RETURNING id INTO poll_id;
    
    -- Insert poll options
    INSERT INTO public.poll_options (poll_id, text, order_index) VALUES
    (poll_id, 'VS Code', 1),
    (poll_id, 'IntelliJ IDEA', 2),
    (poll_id, 'Vim/Neovim', 3),
    (poll_id, 'Sublime Text', 4),
    (poll_id, 'Atom', 5),
    (poll_id, 'Emacs', 6);
    
    RAISE NOTICE 'Second sample poll created with ID: %', poll_id;
END $$;

-- Sample poll 3: Remote work preferences
DO $$
DECLARE
    poll_id UUID;
    sample_user_id UUID;
BEGIN
    -- Insert third sample poll
    INSERT INTO public.polls (title, description, creator_id, allow_multiple_choices)
    VALUES (
        'What is your preferred work arrangement?',
        'With the rise of remote work, we want to know your preferences.',
        '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
        false
    ) RETURNING id INTO poll_id;
    
    -- Insert poll options
    INSERT INTO public.poll_options (poll_id, text, order_index) VALUES
    (poll_id, 'Fully remote', 1),
    (poll_id, 'Hybrid (2-3 days in office)', 2),
    (poll_id, 'Mostly in-office', 3),
    (poll_id, 'Fully in-office', 4);
    
    RAISE NOTICE 'Third sample poll created with ID: %', poll_id;
END $$;
