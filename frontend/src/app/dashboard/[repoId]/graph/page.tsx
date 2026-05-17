'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { apiUrl } from '@/lib/api';

interface GraphNode {
  id: string;
  type: 'decision' | 'code' | 'risk';
  category: string;
  properties: {
    title?: string;
    path?: string;
    status?: string;
    severity?: string;
    complexity_score?: number;
    impact_score?: number;
  };
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: 'strong' | 'medium' | 'weak';
  properties: {
    description: string;
  };
}

interface GraphData {
  nodes: GraphNode[];
  relationships: GraphEdge[];
  clusters: Array<{
    name: string;
    nodes: string[];
    description: string;
  }>;
  stats: {
    total_nodes: number;
    total_edges: number;
    total_risks: number;
    critical_risks: number;
  };
}

export default function KnowledgeGraphPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const repoId = params.repoId as string;
  const highlightId = searchParams.get('highlight');

  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showRisksOnly, setShowRisksOnly] = useState(false);

  // Fetch graph data
  const { data: graphData, isLoading, error } = useQuery<GraphData>({
    queryKey: ['graph', repoId],
    queryFn: async () => {
      const response = await fetch(apiUrl(`/api/repositories/${repoId}/graph`));
      if (!response.ok) throw new Error('Failed to fetch graph data');
      return response.json();
    },
  });

  // Initialize Cytoscape
  useEffect(() => {
    if (!cyRef.current || !graphData || cyInstance.current) return;

    const cy = cytoscape({
      container: cyRef.current,
      elements: [
        // Nodes
        ...graphData.nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.properties.title || node.properties.path || node.id,
            type: node.type,
            category: node.category,
            ...node.properties,
          },
        })),
        // Edges
        ...graphData.relationships.map((edge) => ({
          data: {
            id: edge.id,
            source: edge.from,
            target: edge.to,
            type: edge.type,
            strength: edge.strength,
            description: edge.properties.description,
          },
        })),
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#8b5cf6',
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            color: '#fff',
            'font-size': '12px',
            width: 60,
            height: 60,
            'text-wrap': 'wrap',
            'text-max-width': '80px',
          },
        },
        {
          selector: 'node[type="decision"]',
          style: {
            'background-color': '#8b5cf6',
            shape: 'roundrectangle',
          },
        },
        {
          selector: 'node[type="code"]',
          style: {
            'background-color': '#3b82f6',
            shape: 'ellipse',
          },
        },
        {
          selector: 'node[type="risk"]',
          style: {
            'background-color': '#ef4444',
            shape: 'triangle',
          },
        },
        {
          selector: 'node[severity="critical"]',
          style: {
            'background-color': '#dc2626',
            'border-width': 3,
            'border-color': '#fca5a5',
          },
        },
        {
          selector: 'node[severity="high"]',
          style: {
            'background-color': '#ea580c',
            'border-width': 2,
            'border-color': '#fdba74',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#6366f1',
            'target-arrow-color': '#6366f1',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(type)',
            'font-size': '10px',
            color: '#a78bfa',
            'text-rotation': 'autorotate',
          },
        },
        {
          selector: 'edge[strength="strong"]',
          style: {
            width: 4,
            'line-color': '#8b5cf6',
          },
        },
        {
          selector: 'edge[strength="weak"]',
          style: {
            width: 1,
            'line-color': '#c4b5fd',
            'line-style': 'dashed',
          },
        },
        {
          selector: ':selected',
          style: {
            'background-color': '#fbbf24',
            'line-color': '#fbbf24',
            'target-arrow-color': '#fbbf24',
            'border-width': 3,
            'border-color': '#fef3c7',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      },
      minZoom: 0.3,
      maxZoom: 3,
    });

    // Node click handler
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeData = graphData.nodes.find((n) => n.id === node.id());
      if (nodeData) {
        setSelectedNode(nodeData);
      }
    });

    // Highlight specific node if requested
    if (highlightId) {
      const node = cy.getElementById(highlightId);
      if (node.length > 0) {
        cy.animate({
          center: { eles: node },
          zoom: 1.5,
        });
        node.select();
        const nodeData = graphData.nodes.find((n) => n.id === highlightId);
        if (nodeData) {
          setSelectedNode(nodeData);
        }
      }
    }

    cyInstance.current = cy;

    return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
        cyInstance.current = null;
      }
    };
  }, [graphData, highlightId]);

  // Filter nodes
  useEffect(() => {
    if (!cyInstance.current || !graphData) return;

    const cy = cyInstance.current;

    cy.nodes().forEach((node) => {
      const nodeData = graphData.nodes.find((n) => n.id === node.id());
      if (!nodeData) return;

      let visible = true;

      // Type filter
      if (nodeTypeFilter !== 'all' && nodeData.type !== nodeTypeFilter) {
        visible = false;
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const title = nodeData.properties.title?.toLowerCase() || '';
        const path = nodeData.properties.path?.toLowerCase() || '';
        if (!title.includes(searchLower) && !path.includes(searchLower)) {
          visible = false;
        }
      }

      // Risk filter
      if (showRisksOnly && nodeData.type !== 'risk') {
        visible = false;
      }

      if (visible) {
        node.style('display', 'element');
      } else {
        node.style('display', 'none');
      }
    });

    // Hide edges connected to hidden nodes
    cy.edges().forEach((edge) => {
      const source = edge.source();
      const target = edge.target();
      if (
        source.style('display') === 'none' ||
        target.style('display') === 'none'
      ) {
        edge.style('display', 'none');
      } else {
        edge.style('display', 'element');
      }
    });
  }, [searchQuery, nodeTypeFilter, showRisksOnly, graphData]);

  const handleZoomIn = () => {
    if (cyInstance.current) {
      cyInstance.current.zoom(cyInstance.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyInstance.current) {
      cyInstance.current.zoom(cyInstance.current.zoom() * 0.8);
    }
  };

  const handleFitView = () => {
    if (cyInstance.current) {
      cyInstance.current.fit();
    }
  };

  const handleExportImage = () => {
    if (cyInstance.current) {
      const png = cyInstance.current.png({ full: true, scale: 2 });
      const link = document.createElement('a');
      link.href = png;
      link.download = `knowledge-graph-${repoId}.png`;
      link.click();
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (!cyInstance.current) return;
    const node = cyInstance.current.getElementById(nodeId);
    if (node.length > 0) {
      cyInstance.current.animate({
        center: { eles: node },
        zoom: 1.5,
      });
      node.select();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white text-xl mb-4">Failed to load graph</p>
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
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-purple-500/20">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/dashboard/${repoId}`)}
                className="text-purple-300 hover:text-white"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <ChartBarIcon className="w-7 h-7 text-purple-400" />
                Knowledge Graph
              </h1>
            </div>
            <div className="flex items-center gap-2 text-purple-300 text-sm">
              <span>{graphData.stats.total_nodes} nodes</span>
              <span>•</span>
              <span>{graphData.stats.total_edges} edges</span>
              <span>•</span>
              <span className="text-red-300">{graphData.stats.critical_risks} critical risks</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes..."
                className="w-full px-4 py-2 pl-10 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-purple-400 absolute left-3 top-2.5" />
            </div>

            {/* Type Filter */}
            <select
              value={nodeTypeFilter}
              onChange={(e) => setNodeTypeFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Types</option>
              <option value="decision">Decisions</option>
              <option value="code">Code Files</option>
              <option value="risk">Risks</option>
            </select>

            {/* Risk Toggle */}
            <button
              onClick={() => setShowRisksOnly(!showRisksOnly)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                showRisksOnly
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700/50 text-purple-300 hover:bg-slate-700'
              }`}
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
              Risks Only
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1">
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-slate-600 rounded"
                title="Zoom In"
              >
                <ArrowsPointingOutIcon className="w-5 h-5 text-purple-300" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-slate-600 rounded"
                title="Zoom Out"
              >
                <ArrowsPointingInIcon className="w-5 h-5 text-purple-300" />
              </button>
              <button
                onClick={handleFitView}
                className="p-2 hover:bg-slate-600 rounded"
                title="Fit View"
              >
                <FunnelIcon className="w-5 h-5 text-purple-300" />
              </button>
            </div>

            {/* Export */}
            <button
              onClick={handleExportImage}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <PhotoIcon className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Graph and Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Canvas */}
        <div className="flex-1 relative">
          <div ref={cyRef} className="w-full h-full" />
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm border border-purple-500/30 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 text-sm">Legend</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-600 rounded"></div>
                <span className="text-purple-200">Decision</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                <span className="text-purple-200">Code File</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                <span className="text-purple-200">Risk</span>
              </div>
              <div className="border-t border-purple-500/30 my-2"></div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-purple-600"></div>
                <span className="text-purple-200">Strong</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-purple-400 border-dashed border-t"></div>
                <span className="text-purple-200">Weak</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {selectedNode && (
          <div className="w-96 bg-slate-800/50 backdrop-blur-sm border-l border-purple-500/20 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Node Details</h2>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-purple-300 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-purple-400 text-sm mb-1">Type</p>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    selectedNode.type === 'decision'
                      ? 'bg-purple-500/20 text-purple-300'
                      : selectedNode.type === 'code'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {selectedNode.type}
                  </span>
                </div>

                {selectedNode.properties.title && (
                  <div>
                    <p className="text-purple-400 text-sm mb-1">Title</p>
                    <p className="text-white">{selectedNode.properties.title}</p>
                  </div>
                )}

                {selectedNode.properties.path && (
                  <div>
                    <p className="text-purple-400 text-sm mb-1">Path</p>
                    <code className="text-purple-300 text-sm">{selectedNode.properties.path}</code>
                  </div>
                )}

                {selectedNode.properties.status && (
                  <div>
                    <p className="text-purple-400 text-sm mb-1">Status</p>
                    <p className="text-white">{selectedNode.properties.status}</p>
                  </div>
                )}

                {selectedNode.properties.severity && (
                  <div>
                    <p className="text-purple-400 text-sm mb-1">Severity</p>
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      selectedNode.properties.severity === 'critical'
                        ? 'bg-red-500/20 text-red-300'
                        : selectedNode.properties.severity === 'high'
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {selectedNode.properties.severity}
                    </span>
                  </div>
                )}

                {selectedNode.properties.impact_score !== undefined && (
                  <div>
                    <p className="text-purple-400 text-sm mb-1">Impact Score</p>
                    <p className="text-white">{selectedNode.properties.impact_score}/10</p>
                  </div>
                )}

                {selectedNode.properties.complexity_score !== undefined && (
                  <div>
                    <p className="text-purple-400 text-sm mb-1">Complexity Score</p>
                    <p className="text-white">{selectedNode.properties.complexity_score}/10</p>
                  </div>
                )}

                {selectedNode.type === 'decision' && (
                  <button
                    onClick={() => router.push(`/dashboard/${repoId}/adrs/${selectedNode.id}`)}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    View ADR Details
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Made with Bob
