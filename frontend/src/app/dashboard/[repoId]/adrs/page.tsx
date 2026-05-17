'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  BookOpenIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  UserIcon,
  CodeBracketIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface ADR {
  id: string;
  adr_id: string;
  title: string;
  status: 'accepted' | 'deprecated' | 'superseded' | 'experimental';
  date: string;
  author: string;
  commit_hash: string;
  problem: string;
  decision: string;
  reasoning: string;
  consequences_positive: string[];
  consequences_negative: string[];
  consequences_neutral: string[];
  related_files: Array<{
    path: string;
    lines: string;
    relevance: string;
  }>;
  complexity_score: number;
  impact_score: number;
  category: string;
  created_at: string;
}

export default function ADRBrowserPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'impact' | 'complexity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch ADRs
  const { data: adrs, isLoading, error } = useQuery<ADR[]>({
    queryKey: ['adrs', repoId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/api/repositories/${repoId}/adrs`);
      if (!response.ok) throw new Error('Failed to fetch ADRs');
      return response.json();
    },
  });

  // Filter and sort ADRs
  const filteredAndSortedADRs = useMemo(() => {
    if (!adrs) return [];

    let filtered = adrs.filter((adr) => {
      const matchesSearch =
        searchQuery === '' ||
        adr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adr.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adr.decision.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || adr.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || adr.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'impact') {
        comparison = a.impact_score - b.impact_score;
      } else if (sortBy === 'complexity') {
        comparison = a.complexity_score - b.complexity_score;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [adrs, searchQuery, statusFilter, categoryFilter, sortBy, sortOrder]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!adrs) return [];
    return Array.from(new Set(adrs.map((adr) => adr.category)));
  }, [adrs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'deprecated':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'superseded':
        return <XCircleIcon className="w-5 h-5 text-red-400" />;
      case 'experimental':
        return <ArrowPathIcon className="w-5 h-5 text-blue-400" />;
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
          <p className="text-white text-xl">Loading ADRs...</p>
        </div>
      </div>
    );
  }

  if (error || !adrs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl mb-4">Failed to load ADRs</p>
          <button
            onClick={() => router.push(`/dashboard/${repoId}`)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/dashboard/${repoId}`)}
                className="text-purple-300 hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <BookOpenIcon className="w-8 h-8 text-purple-400" />
                Architecture Decision Records
              </h1>
            </div>
            <div className="text-purple-300">
              {filteredAndSortedADRs.length} of {adrs.length} decisions
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search decisions..."
                className="w-full px-4 py-2 pl-10 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-purple-400 absolute left-3 top-2.5" />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="accepted">Accepted</option>
              <option value="deprecated">Deprecated</option>
              <option value="superseded">Superseded</option>
              <option value="experimental">Experimental</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-purple-300 text-sm">Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-1 rounded-lg text-sm ${
                sortBy === 'date'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700/50 text-purple-300 hover:bg-slate-700'
              }`}
            >
              Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'impact') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('impact');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-1 rounded-lg text-sm ${
                sortBy === 'impact'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700/50 text-purple-300 hover:bg-slate-700'
              }`}
            >
              Impact {sortBy === 'impact' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'complexity') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('complexity');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-1 rounded-lg text-sm ${
                sortBy === 'complexity'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700/50 text-purple-300 hover:bg-slate-700'
              }`}
            >
              Complexity {sortBy === 'complexity' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {/* ADR List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredAndSortedADRs.length === 0 ? (
          <div className="text-center py-12">
            <FunnelIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <p className="text-white text-xl mb-2">No decisions found</p>
            <p className="text-purple-300">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedADRs.map((adr) => (
              <button
                key={adr.id}
                onClick={() => router.push(`/dashboard/${repoId}/adrs/${adr.id}`)}
                className="w-full text-left bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-6 hover:bg-slate-800 hover:border-purple-500/40 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-purple-400 font-mono text-sm">{adr.adr_id}</span>
                      <span className={`px-3 py-1 rounded-full text-xs border flex items-center gap-1 ${getStatusColor(adr.status)}`}>
                        {getStatusIcon(adr.status)}
                        {adr.status}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {adr.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{adr.title}</h3>
                  </div>
                </div>

                {/* Problem Statement */}
                <div className="mb-4">
                  <p className="text-purple-300 text-sm mb-1 font-semibold">Problem:</p>
                  <p className="text-purple-200 line-clamp-2">{adr.problem}</p>
                </div>

                {/* Decision */}
                <div className="mb-4">
                  <p className="text-purple-300 text-sm mb-1 font-semibold">Decision:</p>
                  <p className="text-purple-200 line-clamp-2">{adr.decision}</p>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-purple-300">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {new Date(adr.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    {adr.author}
                  </div>
                  <div className="flex items-center gap-2">
                    <CodeBracketIcon className="w-4 h-4" />
                    {adr.related_files.length} files
                  </div>
                  <div className="flex items-center gap-2">
                    Impact: {adr.impact_score}/10
                  </div>
                  <div className="flex items-center gap-2">
                    Complexity: {adr.complexity_score}/10
                  </div>
                </div>

                {/* Consequences Preview */}
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                    <p className="text-green-300 text-xs font-semibold mb-1">
                      ✓ Positive ({adr.consequences_positive.length})
                    </p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                    <p className="text-red-300 text-xs font-semibold mb-1">
                      ✗ Negative ({adr.consequences_negative.length})
                    </p>
                  </div>
                  <div className="bg-gray-500/10 border border-gray-500/20 rounded p-2">
                    <p className="text-gray-300 text-xs font-semibold mb-1">
                      ⚖ Neutral ({adr.consequences_neutral.length})
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
