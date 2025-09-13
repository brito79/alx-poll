// This script helps ensure the app is compatible with the sample data structure

import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  }
});

// Function to create a sample user (needed for foreign key relationships)
async function createSampleUser() {
  // First check if sample user exists
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'test@example.com')
    .single();
  
  if (existingUser) {
    console.log('Sample user already exists with ID:', existingUser.id);
    return existingUser.id;
  }
  
  // Create a user in auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'password123',
    email_confirm: true
  });
  
  if (authError) {
    console.error('Error creating auth user:', authError);
    throw authError;
  }
  
  console.log('Created sample user with ID:', authUser.user.id);
  return authUser.user.id;
}

// Function to create sample polls based on sample_data.sql
async function createSamplePolls(userId) {
  // Sample poll 1: Favorite programming language
  const { data: poll1, error: error1 } = await supabase
    .from('polls')
    .insert({
      title: 'What is your favorite programming language?',
      description: 'Help us understand what programming languages our community prefers!',
      creator_id: userId,
      allow_multiple_choices: false
    })
    .select('id')
    .single();
  
  if (error1) {
    console.error('Error creating poll 1:', error1);
    return;
  }
  
  console.log('Created poll 1 with ID:', poll1.id);
  
  // Insert poll options for poll 1
  const options1 = [
    { poll_id: poll1.id, text: 'JavaScript/TypeScript', order_index: 1 },
    { poll_id: poll1.id, text: 'Python', order_index: 2 },
    { poll_id: poll1.id, text: 'Java', order_index: 3 },
    { poll_id: poll1.id, text: 'C#', order_index: 4 },
    { poll_id: poll1.id, text: 'Go', order_index: 5 },
    { poll_id: poll1.id, text: 'Rust', order_index: 6 }
  ];
  
  const { error: optionsError1 } = await supabase
    .from('poll_options')
    .insert(options1);
  
  if (optionsError1) {
    console.error('Error creating options for poll 1:', optionsError1);
  }
  
  // Sample poll 2: Best development setup
  const { data: poll2, error: error2 } = await supabase
    .from('polls')
    .insert({
      title: 'What is your preferred development setup?',
      description: 'Let us know how you like to set up your development environment.',
      creator_id: userId,
      allow_multiple_choices: true
    })
    .select('id')
    .single();
  
  if (error2) {
    console.error('Error creating poll 2:', error2);
    return;
  }
  
  console.log('Created poll 2 with ID:', poll2.id);
  
  // Insert poll options for poll 2
  const options2 = [
    { poll_id: poll2.id, text: 'VS Code', order_index: 1 },
    { poll_id: poll2.id, text: 'IntelliJ IDEA', order_index: 2 },
    { poll_id: poll2.id, text: 'Vim/Neovim', order_index: 3 },
    { poll_id: poll2.id, text: 'Sublime Text', order_index: 4 },
    { poll_id: poll2.id, text: 'Atom', order_index: 5 },
    { poll_id: poll2.id, text: 'Emacs', order_index: 6 }
  ];
  
  const { error: optionsError2 } = await supabase
    .from('poll_options')
    .insert(options2);
  
  if (optionsError2) {
    console.error('Error creating options for poll 2:', optionsError2);
  }
  
  // Sample poll 3: Remote work preferences
  const { data: poll3, error: error3 } = await supabase
    .from('polls')
    .insert({
      title: 'What is your preferred work arrangement?',
      description: 'With the rise of remote work, we want to know your preferences.',
      creator_id: userId,
      allow_multiple_choices: false
    })
    .select('id')
    .single();
  
  if (error3) {
    console.error('Error creating poll 3:', error3);
    return;
  }
  
  console.log('Created poll 3 with ID:', poll3.id);
  
  // Insert poll options for poll 3
  const options3 = [
    { poll_id: poll3.id, text: 'Fully remote', order_index: 1 },
    { poll_id: poll3.id, text: 'Hybrid (2-3 days in office)', order_index: 2 },
    { poll_id: poll3.id, text: 'Mostly in-office', order_index: 3 },
    { poll_id: poll3.id, text: 'Fully in-office', order_index: 4 }
  ];
  
  const { error: optionsError3 } = await supabase
    .from('poll_options')
    .insert(options3);
  
  if (optionsError3) {
    console.error('Error creating options for poll 3:', optionsError3);
  }
}

// Main function
async function main() {
  try {
    console.log('Creating sample data...');
    const userId = await createSampleUser();
    await createSamplePolls(userId);
    console.log('Sample data created successfully!');
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
}

main();
