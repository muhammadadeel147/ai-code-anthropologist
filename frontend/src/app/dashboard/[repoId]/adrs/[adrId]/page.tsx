'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { apiUrl } from '@/lib/api';

interface ADRDetail {
  id: string;
  adr_id: string;
  title: string;
  status: string;
  date: string;
  author: string;
  commit_hash: string;
  repository_url: string;
  problem: string;
  decision: string;
  reasoning: string;
  alternatives: string[];
  consequences_positive: string[];
  consequences_negative: string[];
  consequences_neutral: string[];
  related_files: Array<{
    path: string;
    lines: string;
    relevance: string;
  }>;
  related_decisions: Array<{
    adr_id: string;
    title: string;
    relationship: string;
  }>;
  complexity_score: number;
  impact_score: number;
  category: string;
  markdown_content: string;
}

export default function ADRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;
  const adrId = params.adrId as string;

  const { data: adr, isLoading, error } = useQuery<ADRDetail>({
    queryKey: ['adr', repoId, adrId],
    queryFn: async () => {
      const response = await fetch(
        apiUrl(`/api/repositories/${repoId}/adrs/${adrId}`)
      );
      if (!response.ok) throw new Error('Failed to fetch ADR');
      return response.json();
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircleIcon className="w-6 h-6 text-green-400" />;
      case 'deprecated':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />;
      case 'superseded':
        return <XCircleIcon className="w-6 h-6 text-red-400" />;
      case 'experimental':
        return <ArrowPathIcon className="w-6 h-6 text-blue-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'deprecated':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'superseded':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'experimental':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading ADR...</p>
        </div>
      </div>
    );
  }

  if (error || !adr) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl mb-4">Failed to load ADR</p>
          <button
            onClick={() => router.push(`/dashboard/${repoId}/adrs`)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to ADRs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push(`/dashboard/${repoId}/adrs`)}
              className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Back to ADRs
            </button>
            <div className="flex items-center gap-3">
              <span className="text-purple-400 font-mono text-sm">{adr.adr_id}</span>
              <span
                className={`px-3 py-1 rounded-full text-xs border flex items-center gap-1 ${getStatusColor(
                  adr.status
                )}`}
              >
                {getStatusIcon(adr.status)}
                {adr.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title and Metadata */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-white mb-6">{adr.title}</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2 text-purple-300">
              <CalendarIcon className="w-5 h-5" />
              <div>
                <p className="text-xs text-purple-400">Date</p>
                <p className="text-sm">{new Date(adr.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <UserIcon className="w-5 h-5" />
              <div>
                <p className="text-xs text-purple-400">Author</p>
                <p className="text-sm">{adr.author}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <CodeBracketIcon className="w-5 h-5" />
              <div>
                <p className="text-xs text-purple-400">Impact</p>
                <p className="text-sm">{adr.impact_score}/10</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-purple-300">
              <DocumentTextIcon className="w-5 h-5" />
              <div>
                <p className="text-xs text-purple-400">Complexity</p>
                <p className="text-sm">{adr.complexity_score}/10</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-purple-300 text-sm">
            <LinkIcon className="w-4 h-4" />
            <span className="font-mono">{adr.commit_hash.substring(0, 8)}</span>
            <span>•</span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
              {adr.category}
            </span>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />
            Problem Context
          </h2>
          <p className="text-purple-200 leading-relaxed">{adr.problem}</p>
        </div>

        {/* Alternatives Considered */}
        {adr.alternatives && adr.alternatives.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Alternatives Considered</h2>
            <div className="space-y-3">
              {adr.alternatives.map((alt, index) => (
                <div
                  key={index}
                  className="bg-slate-700/50 border border-purple-500/20 rounded-lg p-4"
                >
                  <p className="text-purple-200">{alt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision Made */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircleIcon className="w-6 h-6 text-green-400" />
            Decision Made
          </h2>
          <p className="text-purple-200 leading-relaxed mb-4">{adr.decision}</p>
          
          <div className="bg-slate-700/50 border border-purple-500/20 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Reasoning</h3>
            <p className="text-purple-200 leading-relaxed">{adr.reasoning}</p>
          </div>
        </div>

        {/* Consequences */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Consequences</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Positive */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-300 mb-3 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                Positive
              </h3>
              <ul className="space-y-2">
                {adr.consequences_positive.map((con, index) => (
                  <li key={index} className="text-green-200 text-sm flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Negative */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-300 mb-3 flex items-center gap-2">
                <XCircleIcon className="w-5 h-5" />
                Negative
              </h3>
              <ul className="space-y-2">
                {adr.consequences_negative.map((con, index) => (
                  <li key={index} className="text-red-200 text-sm flex items-start gap-2">
                    <span className="text-red-400 mt-1">✗</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Neutral */}
            <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Neutral
              </h3>
              <ul className="space-y-2">
                {adr.consequences_neutral.map((con, index) => (
                  <li key={index} className="text-gray-200 text-sm flex items-start gap-2">
                    <span className="text-gray-400 mt-1">⚖</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Related Files */}
        {adr.related_files && adr.related_files.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <CodeBracketIcon className="w-6 h-6 text-purple-400" />
              Related Code Files
            </h2>
            <div className="space-y-3">
              {adr.related_files.map((file, index) => (
                <div
                  key={index}
                  className="bg-slate-700/50 border border-purple-500/20 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <code className="text-purple-300 font-mono text-sm">{file.path}</code>
                    <span className="text-purple-400 text-xs">Lines {file.lines}</span>
                  </div>
                  <p className="text-purple-200 text-sm">{file.relevance}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Decisions */}
        {adr.related_decisions && adr.related_decisions.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <LinkIcon className="w-6 h-6 text-purple-400" />
              Related Decisions
            </h2>
            <div className="space-y-3">
              {adr.related_decisions.map((related, index) => (
                <button
                  key={index}
                  onClick={() =>
                    router.push(`/dashboard/${repoId}/adrs/${related.adr_id}`)
                  }
                  className="w-full text-left bg-slate-700/50 border border-purple-500/20 rounded-lg p-4 hover:bg-slate-700 hover:border-purple-500/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-purple-400 font-mono text-sm mr-3">
                        {related.adr_id}
                      </span>
                      <span className="text-white font-semibold">{related.title}</span>
                    </div>
                    <span className="text-purple-300 text-sm">{related.relationship}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Full Markdown Content */}
        {adr.markdown_content && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Full Documentation</h2>
            <div className="prose prose-invert prose-purple max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {adr.markdown_content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
