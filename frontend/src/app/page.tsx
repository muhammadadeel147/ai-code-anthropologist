'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Sparkles, ArrowRight, Github } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const contentType = response.headers.get('content-type') || '';
      const responseBody = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

      if (!response.ok) {
        throw new Error(responseBody.message || 'Failed to submit repository');
      }

      // Redirect to analysis page
      router.push(`/analysis/${responseBody.data.jobId}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              AI Code Anthropologist
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Powered by</span>
            <span className="font-semibold text-blue-600">IBM AI</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Repository Analysis</span>
          </div>

          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Uncover Your Codebase's
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Architectural History
            </span>
          </h2>

          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Enter any GitHub repository URL and let IBM AI analyze it to generate
            comprehensive architectural documentation, decision records, and
            interactive knowledge graphs.
          </p>

          {/* URL Input Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Github className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  required
                  pattern="https://github\.com/[\w-]+/[\w.-]+"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !url}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Repository...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze Repository</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Example Repositories */}
          <div className="mt-12">
            <p className="text-sm text-gray-500 mb-4">Try these examples:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'https://github.com/expressjs/express',
                'https://github.com/facebook/react',
                'https://github.com/nodejs/node',
              ].map((exampleUrl) => (
                <button
                  key={exampleUrl}
                  onClick={() => setUrl(exampleUrl)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  {exampleUrl.split('/').slice(-2).join('/')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto mt-24 grid md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Architecture Decision Records
            </h3>
            <p className="text-gray-600 text-sm">
              Automatically generate formal ADRs documenting key architectural decisions with context and reasoning.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Knowledge Graph
            </h3>
            <p className="text-gray-600 text-sm">
              Visualize relationships between decisions, code files, and dependencies in an interactive graph.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Intelligent Q&A
            </h3>
            <p className="text-gray-600 text-sm">
              Ask natural language questions about the codebase and get instant, context-aware answers.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-gray-600">
          <p>Built with ❤️ using IBM AI • Open Source</p>
        </div>
      </footer>
    </main>
  );
}

// Made with Bob
