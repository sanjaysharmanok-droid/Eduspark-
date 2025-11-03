import { User } from '../types';

// This is a mock authentication service.
// In a real application, this would integrate with Google's Identity Services SDK.

export const signIn = async (): Promise<User> => {
  console.log('Simulating Google Sign-In...');
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const names = ['Alex Doe', 'Jane Smith', 'Peter Jones', 'Mary Williams', 'Sam Wilson'];
  const randomName = names[Math.floor(Math.random() * names.length)];
  const email = `${randomName.toLowerCase().replace(' ', '.')}@example.com`;

  // Return a mock user object
  const mockUser: User = {
    name: randomName,
    email: email,
    picture: `https://api.dicebear.com/8.x/avataaars/svg?seed=${email}`,
  };

  console.log('Sign-In successful:', mockUser);
  return mockUser;
};

export const signOut = async (): Promise<void> => {
  console.log('Simulating Sign-Out...');
  // In a real app, you would call the Google Sign-Out method here.
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log('Sign-Out successful.');
};