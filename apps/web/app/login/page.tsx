// Login Page - Tournament Platform

import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Tournament Platform
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your tournaments
          </p>
        </div>

        <LoginForm />

        <div className="text-center text-sm">
          <span className="text-gray-600">Don&apos;t have an account? </span>
          <a href="/signup" className="font-semibold text-blue-600 hover:text-blue-500">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
