'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { CheckCircle2, Circle, Loader2, XCircle, ArrowLeft } from 'lucide-react';

interface JobStatus {
  id: string;
  repository_id: string;
  repository_url: string;
  repository_name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  total_steps: number;
  progress_percentage: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface ProgressUpdate {
  step: number;
  percentage: number;
  message: string;
}

const STEPS = [
  { id: 1, name: 'Cloning Repository', description: 'Downloading repository files' },
  { id: 2, name: 'Analyzing Code', description: 'IBM AI analyzing repository structure' },
  { id: 3, name: 'Generating ADRs', description: 'Creating Architecture Decision Records' },
  { id: 4, name: 'Building Knowledge Graph', description: 'Mapping code relationships' },
  { id: 5, name: 'Creating Q&A System', description: 'Generating answer function' },
  { id: 6, name: 'Running Tests', description: 'Validating system' },
];

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);

  // Fetch initial job status
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch job');
        }

        setJob(data.data.job);
        setEstimatedTime(data.data.estimatedTimeRemaining);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  // Setup Socket.IO connection for real-time updates
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000');

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      newSocket.emit('subscribe:job', jobId);
    });

    newSocket.on('progress', (data: ProgressUpdate) => {
      console.log('Progress update:', data);
      setCurrentMessage(data.message);
      setJob((prev) => prev ? {
        ...prev,
        current_step: data.step,
        progress_percentage: data.percentage,
      } : null);
    });

    newSocket.on('complete', (data: any) => {
      console.log('Job complete:', data);
      setJob((prev) => prev ? {
        ...prev,
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
      } : null);
      setCurrentMessage('Analysis completed successfully!');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        if (job?.repository_id) {
          router.push(`/dashboard/${job.repository_id}`);
        }
      }, 2000);
    });

    newSocket.on('error', (data: any) => {
      console.error('Job error:', data);
      setJob((prev) => prev ? {
        ...prev,
        status: 'failed',
        error_message: data.error,
      } : null);
      setError(data.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('unsubscribe:job', jobId);
      newSocket.disconnect();
    };
  }, [jobId, router, job?.repository_id]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this analysis?')) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }

      setJob((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading job status...</p>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const getStepStatus = (stepId: number) => {
    if (job.current_step > stepId) return 'completed';
    if (job.current_step === stepId) return 'processing';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Repository Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Analyzing Repository
            </h1>
            <p className="text-gray-600 mb-4">{job.repository_url}</p>
            
            {/* Status Badge */}
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                job.status === 'completed' ? 'bg-green-100 text-green-700' :
                job.status === 'failed' ? 'bg-red-100 text-red-700' :
                job.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </span>
              
              {estimatedTime && job.status === 'processing' && (
                <span className="text-sm text-gray-600">
                  Estimated time remaining: {estimatedTime}
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Progress</h2>
              <span className="text-2xl font-bold text-blue-600">
                {job.progress_percentage}%
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${job.progress_percentage}%` }}
              />
            </div>

            {currentMessage && (
              <p className="text-sm text-gray-600 text-center">
                {currentMessage}
              </p>
            )}
          </div>

          {/* Steps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Analysis Steps</h2>
            
            <div className="space-y-4">
              {STEPS.map((step) => {
                const status = getStepStatus(step.id);
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                      status === 'processing' ? 'bg-blue-50 border-2 border-blue-200' :
                      status === 'completed' ? 'bg-green-50 border border-green-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {status === 'completed' && (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      )}
                      {status === 'processing' && (
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      )}
                      {status === 'pending' && (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        status === 'processing' ? 'text-blue-900' :
                        status === 'completed' ? 'text-green-900' :
                        'text-gray-700'
                      }`}>
                        {step.name}
                      </h3>
                      <p className={`text-sm ${
                        status === 'processing' ? 'text-blue-700' :
                        status === 'completed' ? 'text-green-700' :
                        'text-gray-500'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {job.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
              <p className="text-red-700">{job.error_message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            {job.status === 'processing' && (
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Cancel Analysis
              </button>
            )}
            
            {job.status === 'completed' && job.repository_id && (
              <button
                onClick={() => router.push(`/dashboard/${job.repository_id}`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Results
              </button>
            )}
            
            {(job.status === 'failed' || job.status === 'cancelled') && (
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Try Another Repository
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
