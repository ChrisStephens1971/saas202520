// Landing Page - Hero Section

import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();

  // If already logged in, go straight to console
  if (session?.user) {
    redirect('/console');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Offline-First Tournament Management
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed">
            Run pool and billiards tournaments anywhere, even without internet
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 hover:scale-105 w-full sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              href="/about"
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 hover:scale-105 w-full sm:w-auto"
            >
              Learn More
            </Link>
          </div>

          {/* Features Preview */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-slate-700">
              <div className="text-blue-400 text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-white mb-2">Works Offline</h3>
              <p className="text-slate-400">
                Run tournaments without internet. Data syncs automatically when online.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-slate-700">
              <div className="text-blue-400 text-4xl mb-4">🎱</div>
              <h3 className="text-xl font-semibold text-white mb-2">Built for Pool</h3>
              <p className="text-slate-400">
                Specialized scoring for 8-ball, 9-ball, and other billiards formats.
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur p-6 rounded-lg border border-slate-700">
              <div className="text-blue-400 text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">Real-Time Updates</h3>
              <p className="text-slate-400">
                Players and spectators see live scores and brackets on any device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
