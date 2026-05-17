'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface RepositoryData {
  id: string;
  url: string;
  name: string;
  language: string;
  total_commits: number;
  date_created: string;
  last_commit: string;
  total_files: number;
  analysis_completed_at: string;
}

interface DashboardStats {
  repository: RepositoryData;
  stats: {
    total_decisions: number;
    total_nodes: number;
    total_edges: number;
    total_risks: number;
    critical_risks: number;
    high_risks: number;
    medium_risks: number;
    low_risks: number;
    active_decisions: number;
    deprecated_decisions: number;
    superseded_decisions: number;
  };
  recent_adrs: Array<{
    id: string;
    title: string;
    status: string;
    date: string;
    impact_score: number;
  }>;
  top_risks: Array<{
    id: string;
    title: string;
    severity: string;
    type: string;
  }>;
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch dashboard data
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard', repoId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/api/repositories/${repoId}/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
  });

  const handleExport = async (format: 'json' | 'pdf' | 'markdown') => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/repositories/${repoId}/export?format=${format}`
      );
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis-${repoId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/dashboard/${repoId}/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl mb-4">Failed to load dashboard</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const { repository, stats, recent_adrs, top_risks } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {repository.name}
              </h1>
              <p className="text-purple-300 text-sm">
                {repository.url}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('json')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Export JSON
              </button>
              <button
                onClick={() => handleExport('markdown')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Export MD
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search decisions, code, risks..."
                className="w-full px-4 py-3 pl-12 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <MagnifyingGlassIcon className="w-6 h-6 text-purple-400 absolute left-3 top-3.5" />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-2 px-4 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Repository Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <CodeBracketIcon className="w-8 h-8 text-blue-400" />
              <span className="text-3xl font-bold text-white">{repository.total_files}</span>
            </div>
            <p className="text-purple-300 text-sm">Total Files</p>
            <p className="text-purple-400 text-xs mt-1">{repository.language}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <ClockIcon className="w-8 h-8 text-green-400" />
              <span className="text-3xl font-bold text-white">{repository.total_commits}</span>
            </div>
            <p className="text-purple-300 text-sm">Total Commits</p>
            <p className="text-purple-400 text-xs mt-1">
              {new Date(repository.date_created).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <BookOpenIcon className="w-8 h-8 text-purple-400" />
              <span className="text-3xl font-bold text-white">{stats.total_decisions}</span>
            </div>
            <p className="text-purple-300 text-sm">Decisions Found</p>
            <p className="text-purple-400 text-xs mt-1">
              {stats.active_decisions} active
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
              <span className="text-3xl font-bold text-white">{stats.total_risks}</span>
            </div>
            <p className="text-purple-300 text-sm">Total Risks</p>
            <p className="text-purple-400 text-xs mt-1">
              {stats.critical_risks} critical
            </p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* ADR Browser Card */}
          <button
            onClick={() => router.push(`/dashboard/${repoId}/adrs`)}
            className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg p-8 text-left hover:scale-105 transition-transform duration-200 border border-purple-400/30"
          >
            <BookOpenIcon className="w-12 h-12 text-white mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              Architecture Decisions
            </h3>
            <p className="text-purple-100 mb-4">
              Browse {stats.total_decisions} architectural decisions with full context and reasoning
            </p>
            <div className="flex gap-4 text-sm">
              <span className="text-green-300">✓ {stats.active_decisions} Active</span>
              <span className="text-yellow-300">⚠ {stats.deprecated_decisions} Deprecated</span>
            </div>
          </button>

          {/* Knowledge Graph Card */}
          <button
            onClick={() => router.push(`/dashboard/${repoId}/graph`)}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-8 text-left hover:scale-105 transition-transform duration-200 border border-blue-400/30"
          >
            <ChartBarIcon className="w-12 h-12 text-white mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              Knowledge Graph
            </h3>
            <p className="text-blue-100 mb-4">
              Explore {stats.total_nodes} nodes and {stats.total_edges} relationships
            </p>
            <div className="flex gap-4 text-sm">
              <span className="text-red-300">🔴 {stats.critical_risks} Critical</span>
              <span className="text-orange-300">🟠 {stats.high_risks} High</span>
            </div>
          </button>

          {/* Q&A Interface Card */}
          <button
            onClick={() => router.push(`/dashboard/${repoId}/qa`)}
            className="bg-gradient-to-br from-green-600 to-green-800 rounded-lg p-8 text-left hover:scale-105 transition-transform duration-200 border border-green-400/30"
          >
            <ChatBubbleLeftRightIcon className="w-12 h-12 text-white mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              Ask Questions
            </h3>
            <p className="text-green-100 mb-4">
              Get instant answers about any architectural decision or code pattern
            </p>
            <div className="text-sm text-green-300">
              💬 Natural language interface
            </div>
          </button>
        </div>

        {/* Recent ADRs and Top Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent ADRs */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BookOpenIcon className="w-6 h-6 text-purple-400" />
              Recent Decisions
            </h3>
            <div className="space-y-3">
              {recent_adrs.map((adr) => (
                <button
                  key={adr.id}
                  onClick={() => router.push(`/dashboard/${repoId}/adrs/${adr.id}`)}
                  className="w-full text-left p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-semibold">{adr.title}</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        adr.status === 'active'
                          ? 'bg-green-500/20 text-green-300'
                          : adr.status === 'deprecated'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-gray-500/20 text-gray-300'
                      }`}
                    >
                      {adr.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-purple-300">
                    <span>{new Date(adr.date).toLocaleDateString()}</span>
                    <span>Impact: {adr.impact_score}/10</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Top Risks */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              Top Risks
            </h3>
            <div className="space-y-3">
              {top_risks.map((risk) => (
                <button
                  key={risk.id}
                  onClick={() => router.push(`/dashboard/${repoId}/graph?highlight=${risk.id}`)}
                  className="w-full text-left p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-semibold">{risk.title}</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        risk.severity === 'critical'
                          ? 'bg-red-500/20 text-red-300'
                          : risk.severity === 'high'
                          ? 'bg-orange-500/20 text-orange-300'
                          : risk.severity === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {risk.severity}
                    </span>
                  </div>
                  <p className="text-sm text-purple-300">{risk.type}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Analysis Info */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 text-purple-300">
            <CheckCircleIcon className="w-6 h-6 text-green-400" />
            <span>
              Analysis completed on{' '}
              {new Date(repository.analysis_completed_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
