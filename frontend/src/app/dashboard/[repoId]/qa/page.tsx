'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ClockIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  BookOpenIcon,
  CodeBracketIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

interface QAAnswer {
  question: string;
  intent_type: string;
  confidence_score: number;
  direct_answer: {
    summary: string;
    key_point_1?: string;
    key_point_2?: string;
    key_point_3?: string;
  };
  historical_context?: {
    when_decided: string;
    problem_at_time: string;
    timeline_events: Array<{
      date: string;
      event: string;
    }>;
  };
  technical_details?: {
    decision_made: string;
    alternatives_considered: string[];
    code_examples: Array<{
      file: string;
      lines: string;
      snippet: string;
      explanation: string;
    }>;
  };
  related_decisions?: Array<{
    adr_id: string;
    title: string;
    relationship: string;
    summary: string;
  }>;
  impact_of_changes?: {
    is_safe_to_change: boolean;
    risk_level: string;
    what_will_break: Array<{
      item: string;
      impact: string;
      mitigation: string;
    }>;
    recommended_approach: string;
  };
  related_files?: Array<{
    path: string;
    purpose: string;
    relevance: string;
  }>;
  warnings?: Array<{
    severity: string;
    message: string;
  }>;
  sources?: Array<{
    type: string;
    id: string;
    title: string;
    link?: string;
  }>;
  error?: string;
  suggested_questions?: string[];
}

interface QAHistory {
  id: string;
  question: string;
  answer: QAAnswer;
  created_at: string;
}

export default function QAInterfacePage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;
  const queryClient = useQueryClient();

  const [question, setQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState<QAAnswer | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch QA history
  const { data: history } = useQuery<QAHistory[]>({
    queryKey: ['qa-history', repoId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/api/repositories/${repoId}/qa/history`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch suggested questions
  const { data: suggestedQuestions } = useQuery<string[]>({
    queryKey: ['suggested-questions', repoId],
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:3001/api/repositories/${repoId}/qa/suggestions`
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Ask question mutation
  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await fetch(`http://localhost:3001/api/repositories/${repoId}/qa/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      if (!response.ok) throw new Error('Failed to get answer');
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentAnswer(data);
      queryClient.invalidateQueries({ queryKey: ['qa-history', repoId] });
      scrollToBottom();
    },
  });

  const handleAsk = () => {
    if (question.trim()) {
      askMutation.mutate(question);
      setQuestion('');
    }
  };

  const handleSuggestedQuestion = (q: string) => {
    setQuestion(q);
    askMutation.mutate(q);
    setQuestion('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentAnswer]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-purple-500/20">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/dashboard/${repoId}`)}
                className="text-purple-300 hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <ChatBubbleLeftRightIcon className="w-7 h-7 text-purple-400" />
                Ask Questions
              </h1>
            </div>
            <div className="text-purple-300 text-sm">
              {history?.length || 0} questions asked
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Welcome Message */}
              {!currentAnswer && (!history || history.length === 0) && (
                <div className="text-center py-12">
                  <ChatBubbleLeftRightIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Ask me anything about this codebase
                  </h2>
                  <p className="text-purple-300 mb-6">
                    I can explain decisions, analyze change impacts, and answer technical questions
                  </p>

                  {/* Suggested Questions */}
                  {suggestedQuestions && suggestedQuestions.length > 0 && (
                    <div className="mt-8">
                      <p className="text-purple-400 text-sm mb-4 flex items-center justify-center gap-2">
                        <LightBulbIcon className="w-5 h-5" />
                        Try asking:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {suggestedQuestions.slice(0, 6).map((q, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestedQuestion(q)}
                            className="text-left p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg hover:bg-slate-800 hover:border-purple-500/40 transition-all"
                          >
                            <p className="text-purple-200 text-sm">{q}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Current Answer */}
              {currentAnswer && (
                <div className="space-y-4">
                  {/* Question */}
                  <div className="flex justify-end">
                    <div className="bg-purple-600 text-white rounded-lg px-4 py-3 max-w-2xl">
                      <p>{askMutation.variables}</p>
                    </div>
                  </div>

                  {/* Answer */}
                  {currentAnswer.error ? (
                    <div className="bg-slate-800/50 border border-red-500/30 rounded-lg p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <XCircleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                        <div>
                          <h3 className="text-red-300 font-semibold mb-2">
                            {currentAnswer.error}
                          </h3>
                          <p className="text-purple-200">{currentAnswer.error}</p>
                        </div>
                      </div>

                      {currentAnswer.suggested_questions && (
                        <div className="mt-4 pt-4 border-t border-purple-500/20">
                          <p className="text-purple-400 text-sm mb-3">Did you mean:</p>
                          <div className="space-y-2">
                            {currentAnswer.suggested_questions.map((q, index) => (
                              <button
                                key={index}
                                onClick={() => handleSuggestedQuestion(q)}
                                className="block w-full text-left p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 text-purple-200 text-sm"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 space-y-6">
                      {/* Direct Answer */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircleIcon className="w-6 h-6 text-green-400" />
                          <h3 className="text-xl font-bold text-white">Answer</h3>
                          <span className="text-purple-400 text-sm">
                            ({Math.round(currentAnswer.confidence_score * 100)}% confidence)
                          </span>
                        </div>
                        <p className="text-purple-100 text-lg mb-4">
                          {currentAnswer.direct_answer.summary}
                        </p>
                        {currentAnswer.direct_answer.key_point_1 && (
                          <ul className="space-y-2 text-purple-200">
                            <li className="flex items-start gap-2">
                              <span className="text-purple-400 mt-1">•</span>
                              {currentAnswer.direct_answer.key_point_1}
                            </li>
                            {currentAnswer.direct_answer.key_point_2 && (
                              <li className="flex items-start gap-2">
                                <span className="text-purple-400 mt-1">•</span>
                                {currentAnswer.direct_answer.key_point_2}
                              </li>
                            )}
                            {currentAnswer.direct_answer.key_point_3 && (
                              <li className="flex items-start gap-2">
                                <span className="text-purple-400 mt-1">•</span>
                                {currentAnswer.direct_answer.key_point_3}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>

                      {/* Historical Context */}
                      {currentAnswer.historical_context && (
                        <div className="border-t border-purple-500/20 pt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <ClockIcon className="w-5 h-5 text-purple-400" />
                            <h4 className="text-lg font-semibold text-white">Historical Context</h4>
                          </div>
                          <p className="text-purple-200 mb-3">
                            {currentAnswer.historical_context.problem_at_time}
                          </p>
                          {currentAnswer.historical_context.timeline_events && (
                            <div className="space-y-2">
                              {currentAnswer.historical_context.timeline_events.map((event, index) => (
                                <div key={index} className="flex items-start gap-3 text-sm">
                                  <span className="text-purple-400 font-mono">
                                    {new Date(event.date).toLocaleDateString()}
                                  </span>
                                  <span className="text-purple-200">{event.event}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Technical Details */}
                      {currentAnswer.technical_details && (
                        <div className="border-t border-purple-500/20 pt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <CodeBracketIcon className="w-5 h-5 text-purple-400" />
                            <h4 className="text-lg font-semibold text-white">Technical Details</h4>
                          </div>
                          <p className="text-purple-200 mb-4">
                            {currentAnswer.technical_details.decision_made}
                          </p>

                          {currentAnswer.technical_details.alternatives_considered &&
                            currentAnswer.technical_details.alternatives_considered.length > 0 && (
                              <div className="mb-4">
                                <p className="text-purple-400 text-sm mb-2">Alternatives Considered:</p>
                                <ul className="space-y-1">
                                  {currentAnswer.technical_details.alternatives_considered.map(
                                    (alt, index) => (
                                      <li key={index} className="text-purple-200 text-sm">
                                        • {alt}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {currentAnswer.technical_details.code_examples &&
                            currentAnswer.technical_details.code_examples.length > 0 && (
                              <div className="space-y-3">
                                {currentAnswer.technical_details.code_examples.map((example, index) => (
                                  <div
                                    key={index}
                                    className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-4"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <code className="text-purple-300 text-sm">{example.file}</code>
                                      <span className="text-purple-400 text-xs">
                                        Lines {example.lines}
                                      </span>
                                    </div>
                                    <SyntaxHighlighter
                                      language="javascript"
                                      style={vscDarkPlus}
                                      customStyle={{
                                        margin: 0,
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                      }}
                                    >
                                      {example.snippet}
                                    </SyntaxHighlighter>
                                    <p className="text-purple-200 text-sm mt-2">{example.explanation}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      )}

                      {/* Impact of Changes */}
                      {currentAnswer.impact_of_changes && (
                        <div className="border-t border-purple-500/20 pt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
                            <h4 className="text-lg font-semibold text-white">Change Impact Analysis</h4>
                          </div>

                          <div className="mb-4">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-purple-400 text-sm">Safe to change:</span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs ${
                                  currentAnswer.impact_of_changes.is_safe_to_change
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                {currentAnswer.impact_of_changes.is_safe_to_change ? 'Yes' : 'No'}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs border ${getRiskLevelColor(
                                  currentAnswer.impact_of_changes.risk_level
                                )}`}
                              >
                                {currentAnswer.impact_of_changes.risk_level} risk
                              </span>
                            </div>
                          </div>

                          {currentAnswer.impact_of_changes.what_will_break &&
                            currentAnswer.impact_of_changes.what_will_break.length > 0 && (
                              <div className="space-y-3 mb-4">
                                {currentAnswer.impact_of_changes.what_will_break.map((item, index) => (
                                  <div
                                    key={index}
                                    className="bg-slate-900/50 border border-red-500/20 rounded-lg p-4"
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <span className="text-white font-semibold">{item.item}</span>
                                      <span className="text-red-300 text-sm">{item.impact}</span>
                                    </div>
                                    <p className="text-purple-200 text-sm">{item.mitigation}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                          {currentAnswer.impact_of_changes.recommended_approach && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                              <p className="text-blue-300 text-sm font-semibold mb-2">
                                Recommended Approach:
                              </p>
                              <p className="text-blue-200 text-sm">
                                {currentAnswer.impact_of_changes.recommended_approach}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Related Decisions */}
                      {currentAnswer.related_decisions && currentAnswer.related_decisions.length > 0 && (
                        <div className="border-t border-purple-500/20 pt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <BookOpenIcon className="w-5 h-5 text-purple-400" />
                            <h4 className="text-lg font-semibold text-white">Related Decisions</h4>
                          </div>
                          <div className="space-y-2">
                            {currentAnswer.related_decisions.map((decision, index) => (
                              <button
                                key={index}
                                onClick={() =>
                                  router.push(`/dashboard/${repoId}/adrs/${decision.adr_id}`)
                                }
                                className="w-full text-left p-4 bg-slate-900/50 border border-purple-500/20 rounded-lg hover:bg-slate-900 hover:border-purple-500/40 transition-all"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-purple-400 font-mono text-sm">
                                    {decision.adr_id}
                                  </span>
                                  <span className="text-purple-300 text-xs">
                                    {decision.relationship}
                                  </span>
                                </div>
                                <p className="text-white font-semibold mb-1">{decision.title}</p>
                                <p className="text-purple-200 text-sm">{decision.summary}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {currentAnswer.warnings && currentAnswer.warnings.length > 0 && (
                        <div className="border-t border-purple-500/20 pt-6">
                          <div className="space-y-2">
                            {currentAnswer.warnings.map((warning, index) => (
                              <div
                                key={index}
                                className={`p-4 rounded-lg border ${
                                  warning.severity === 'critical'
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : warning.severity === 'high'
                                    ? 'bg-orange-500/10 border-orange-500/30'
                                    : 'bg-yellow-500/10 border-yellow-500/30'
                                }`}
                              >
                                <p
                                  className={`text-sm ${
                                    warning.severity === 'critical'
                                      ? 'text-red-300'
                                      : warning.severity === 'high'
                                      ? 'text-orange-300'
                                      : 'text-yellow-300'
                                  }`}
                                >
                                  {warning.message}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sources */}
                      {currentAnswer.sources && currentAnswer.sources.length > 0 && (
                        <div className="border-t border-purple-500/20 pt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <LinkIcon className="w-5 h-5 text-purple-400" />
                            <h4 className="text-lg font-semibold text-white">Sources</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {currentAnswer.sources.map((source, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-slate-900/50 border border-purple-500/20 rounded-full text-purple-300 text-xs"
                              >
                                {source.type}: {source.id}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-purple-500/20 bg-slate-800/50 backdrop-blur-sm p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !askMutation.isPending && handleAsk()}
                  placeholder="Ask a question about this codebase..."
                  disabled={askMutation.isPending}
                  className="flex-1 px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                />
                <button
                  onClick={handleAsk}
                  disabled={!question.trim() || askMutation.isPending}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {askMutation.isPending ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-5 h-5" />
                      Ask
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        {history && history.length > 0 && (
          <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-purple-500/20 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-purple-400" />
                History
              </h3>
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setQuestion(item.question);
                      setCurrentAnswer(item.answer);
                    }}
                    className="w-full text-left p-3 bg-slate-700/50 border border-purple-500/20 rounded-lg hover:bg-slate-700 hover:border-purple-500/40 transition-all"
                  >
                    <p className="text-purple-200 text-sm line-clamp-2 mb-1">{item.question}</p>
                    <p className="text-purple-400 text-xs">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
