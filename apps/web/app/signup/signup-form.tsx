'use client';

// Signup Form Component - Creates user + organization

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsLoading(true);

    try {
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const orgName = formData.get('orgName') as string;

      // Create user + organization
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, orgName }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create account');
        return;
      }

      // Auto-login after signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but failed to sign in. Please try logging in.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-md shadow-sm">
        <div>
          <label htmlFor="name" className="sr-only">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Full name"
          />
        </div>

        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Email address"
          />
        </div>

        <div>
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Password (min 6 characters)"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
            Organization name
          </label>
          <input
            id="orgName"
            name="orgName"
            type="text"
            required
            className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., Phoenix Pool League"
          />
          <p className="mt-1 text-xs text-gray-500">
            Your organization hosts tournaments and manages players
          </p>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </div>

      <div className="text-xs text-center text-gray-500">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </div>
    </form>
  );
}
