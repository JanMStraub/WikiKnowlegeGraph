import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import type { useGraphState } from '../hooks/useGraphState';
import type { GraphEdge, GraphNode } from '../types';
import { findAllPairPaths } from '../lib/shortestPath';
import EmptyState from './EmptyState';
import ExportMenu from './ExportMenu';
import './GraphView.css';

interface GraphViewProps {
    graphState: ReturnType<typeof useGraphState>;
}

// Add these to index.css or App.css:
// :root {
//   --color-text-primary: #fff;
//   --color-primary: #2563eb;
//   --color-primary-hover: #1d4ed8;
// }

export default function GraphView({ graphState }: GraphViewProps) {
    const fgRef = useRef<ForceGraphMethods>();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoverNode, setHoverNode] = useState<string | null>(null);

    // Resize listener
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            setDimensions({
                width: entries[0].contentRect.width,
                height: entries[0].contentRect.height
            });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Map graphState properties to react-force-graph expected format
    const graphData = useMemo(() => {
        // 1. Group filtering & Pruning logically matches what we had in vis-network
        const groupHiddenIds = new Set<string>();
        for (const node of graphState.nodes) {
            if (!graphState.filters[node.group]) {
                groupHiddenIds.add(node.id);
            }
        }

        const visibleEdgesUnfiltered = graphState.edges.filter(
            (e) => !groupHiddenIds.has(e.from) && !groupHiddenIds.has(e.to)
        );

        const degrees = new Map<string, number>();
        for (const e of visibleEdgesUnfiltered) {
            degrees.set(e.from, (degrees.get(e.from) || 0) + 1);
            degrees.set(e.to, (degrees.get(e.to) || 0) + 1);
        }

        const maxDegree = Math.max(1, ...Array.from(degrees.values()));
        const pruningThreshold = (graphState.pruningThreshold / 100) * maxDegree;

        const hiddenNodeIds = new Set<string>(groupHiddenIds);
        for (const node of graphState.nodes) {
            if (hiddenNodeIds.has(node.id)) continue;
            const degree = degrees.get(node.id) || 0;
            if (graphState.pruningThreshold > 0 && degree < pruningThreshold && !node.isInitialEntity) {
                hiddenNodeIds.add(node.id);
            }
        }

        const nodes = graphState.nodes
            .filter((n) => !hiddenNodeIds.has(n.id))
            .map((n) => ({ ...n, id: n.id, val: n.size })); // force-graph uses 'val' for node size heuristic

        const links = graphState.edges
            .filter(
                (e) =>
                    !hiddenNodeIds.has(e.from) &&
                    !hiddenNodeIds.has(e.to) &&
                    !(e.category && graphState.edgeCategoryFilters[e.category] === false)
            )
            .map((e) => ({ ...e, source: e.from, target: e.to })); // force-graph uses source/target

        return { nodes, links };
    }, [graphState.nodes, graphState.edges, graphState.filters, graphState.pruningThreshold, graphState.edgeCategoryFilters]);

    // Handle Physics Enable/Disable
    useEffect(() => {
        const fg = fgRef.current;
        if (fg) {
            if (graphState.isPhysicsEnabled) {
                fg.d3ReheatSimulation();
            } else {
                fg.d3AlphaTarget(0);
                // Cool down immediately
                setTimeout(() => {
                    fg.pauseAnimation();
                    fg.resumeAnimation(); // Render static
                }, 0);
            }
        }
    }, [graphState.isPhysicsEnabled, graphData]);


    // Computed Maps for high performance O(1) checks during canvas render loops
    const pathNodeIds = useMemo(() => {
        const set = new Set<string>();
        for (const path of graphState.highlightedPaths) {
            for (const nid of path.nodeIds) set.add(nid);
        }
        return set;
    }, [graphState.highlightedPaths]);

    const pathEdgeIds = useMemo(() => {
        const set = new Set<string>();
        for (const path of graphState.highlightedPaths) {
            for (const eid of path.edgeIds) set.add(eid);
        }
        return set;
    }, [graphState.highlightedPaths]);

    const connectedNodes = useMemo(() => {
        const set = new Set<string>();
        if (graphState.selectedNode?.id) {
            set.add(graphState.selectedNode.id);
            for (const e of graphData.links) {
                // Handle ForceGraph object representation
                const src = typeof e.source === 'object' ? (e.source as any).id : e.source;
                const tgt = typeof e.target === 'object' ? (e.target as any).id : e.target;
                if (src === graphState.selectedNode.id || tgt === graphState.selectedNode.id) {
                    set.add(src);
                    set.add(tgt);
                }
            }
        } else if (graphState.selectedEdge?.id) {
            set.add(graphState.selectedEdge.fromNode?.id || '');
            set.add(graphState.selectedEdge.toNode?.id || '');
        }
        return set;
    }, [graphState.selectedNode, graphState.selectedEdge, graphData.links]);

    const imagesCache = useRef(new Map<string, HTMLImageElement>());

    // Image loading strategy for canvas
    const getNodeImage = useCallback((url?: string) => {
        if (!url) return null;
        if (!imagesCache.current.has(url)) {
            const img = new Image();
            img.src = url;
            // Triggers a re-render loosely by dirtying the canvas when loaded
            imagesCache.current.set(url, img);
            img.onload = () => {
                // Small hack to force canvas re-draw once image loads
                fgRef.current?.zoom(fgRef.current.zoom() + 0.00001);
            };
        }
        const img = imagesCache.current.get(url)!;
        return img.complete ? img : null;
    }, []);

    const drawNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const isFocused = graphState.selectedNode?.id === node.id;
        const isHovered = hoverNode === node.id;
        const isInitial = node.isInitialEntity;

        let isDimmed = false;

        if (graphState.isPathMode) {
            isDimmed = !pathNodeIds.has(node.id);
        } else if (graphState.selectedNode || graphState.selectedEdge) {
            isDimmed = !connectedNodes.has(node.id);
        }

        const size = node.val || 15;
        const r = size / 2;

        ctx.save();

        if (isDimmed) {
            ctx.globalAlpha = 0.1;
        }

        // Draw Shape
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + (isFocused ? 2 : 0), 0, 2 * Math.PI, false);

        if (node.shape === 'circularImage' && node.image) {
            const img = getNodeImage(node.image);
            if (img) {
                ctx.save();
                ctx.clip();
                ctx.drawImage(img, node.x - r, node.y - r, size, size);
                ctx.restore();
            } else {
                ctx.fillStyle = '#666';
                ctx.fill();
            }
        } else {
            // Color based on group... a fallback if we had vis-network colors ported. 
            // For now we just use standard node circle
            ctx.fillStyle = isInitial ? '#3b82f6' : '#9ca3af'; // Blue for initial, gray others
            switch (node.group) {
                case 'country': ctx.fillStyle = '#ef4444'; break;
                case 'city': ctx.fillStyle = '#06b6d4'; break;
                case 'location': ctx.fillStyle = '#22c55e'; break;
                case 'organization': ctx.fillStyle = '#ec4899'; break;
                case 'company': ctx.fillStyle = '#f59e0b'; break;
                case 'school': ctx.fillStyle = '#a855f7'; break;
            }
            ctx.fill();
        }

        // Border
        ctx.lineWidth = isFocused ? 3 : 1.5;
        ctx.strokeStyle = isFocused ? '#fff' : 'rgba(255,255,255,0.85)';
        ctx.stroke();

        // Label logic (similar to old vis-network Zoom + Focus Logic)
        const showLabel = isFocused || isHovered || (isInitial && globalScale > 0.8) || (!isDimmed && connectedNodes.size > 0) || globalScale > 2.0;

        if (showLabel) {
            const label = node.label;
            const fontSize = isFocused ? 14 : isInitial ? 12 : 10;
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Background pill for text
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + r + 4, bckgDimensions[0], bckgDimensions[1]);

            ctx.fillStyle = '#fff';
            ctx.fillText(label, node.x, node.y + r + 4 + fontSize / 2);
        }

        ctx.restore();
    }, [graphState.selectedNode, graphState.selectedEdge, graphState.isPathMode, pathNodeIds, connectedNodes, hoverNode, getNodeImage]);

    const drawLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        let isHighlighted = false;
        let isDimmed = false;

        if (graphState.isPathMode) {
            if (pathEdgeIds.has(link.id)) {
                isHighlighted = true;
            } else {
                isDimmed = true;
            }
        } else if (graphState.selectedNode) {
            // Highlight links connected to selected node
            const linkSrcId = typeof link.source === 'object' ? link.source.id : link.source;
            const linkTgtId = typeof link.target === 'object' ? link.target.id : link.target;

            if (linkSrcId === graphState.selectedNode.id || linkTgtId === graphState.selectedNode.id) {
                isHighlighted = true;
            } else {
                isDimmed = true;
            }
        } else if (graphState.selectedEdge) {
            if (graphState.selectedEdge.id === link.id) {
                isHighlighted = true;
            } else {
                isDimmed = true;
            }
        }

        // Width
        ctx.lineWidth = isHighlighted ? 2.5 : 0.3;
        if (globalScale > 2.0 && !isDimmed) ctx.lineWidth = Math.max(ctx.lineWidth, 1.0);

        // Color
        ctx.strokeStyle = isHighlighted ? '#2563eb' : 'rgba(150,150,150,0.25)';
        if (graphState.isPathMode && isHighlighted) ctx.strokeStyle = '#f59e0b'; // Amber for paths
        if (isDimmed) ctx.strokeStyle = 'rgba(180,180,180,0.05)';

        // Label on edge if highly zoomed or highlighted
        const showEdgeLabel = isHighlighted || globalScale > 3.0;

        if (showEdgeLabel && !isDimmed && link.source.x && link.target.x) {
            // Calculate mid point
            const midX = (link.source.x + link.target.x) / 2;
            const midY = (link.source.y + link.target.y) / 2;

            ctx.font = "8px Inter, sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const label = link.label;
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(midX - textWidth / 2 - 2, midY - 6, textWidth + 4, 12);

            ctx.fillStyle = '#fff';
            if (isHighlighted) {
                ctx.fillStyle = graphState.isPathMode ? '#f59e0b' : '#3b82f6';
            }
            ctx.fillText(label, midX, midY);
        }

    }, [graphState.selectedNode, graphState.selectedEdge, graphState.isPathMode, pathEdgeIds]);


    // Interaction Handlers
    const handleNodeClick = useCallback((node: any) => {
        graphState.setSelectedEdge(null);
        graphState.setSelectedNode(node);

        // Zoom to node
        if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 600);
            fgRef.current.zoom(3, 600);
        }
    }, [graphState]);

    const handleLinkClick = useCallback((link: any) => {
        graphState.setSelectedNode(null);

        const fromNode = graphData.nodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source)) || null;
        const toNode = graphData.nodes.find(n => n.id === (typeof link.target === 'object' ? link.target.id : link.target)) || null;

        graphState.setSelectedEdge({
            id: link.id,
            label: link.label,
            category: link.category,
            fromNode,
            toNode
        });
    }, [graphState, graphData.nodes]);

    const handleBackgroundClick = useCallback(() => {
        graphState.setSelectedNode(null);
        graphState.setSelectedEdge(null);
        if (graphState.isPathMode) {
            graphState.setIsPathMode(false);
            graphState.setHighlightedPaths([]);
        }
    }, [graphState]);

    const fitNetwork = () => {
        if (fgRef.current) {
            fgRef.current.zoomToFit(600, 50);
        }
    };

    const togglePathMode = () => {
        if (graphState.isPathMode) {
            graphState.setIsPathMode(false);
            graphState.setHighlightedPaths([]);
            return;
        }

        const initialEntityIds = graphState.nodes
            .filter((n) => n.isInitialEntity)
            .map((n) => n.id);

        if (initialEntityIds.length < 2) return;

        const paths = findAllPairPaths(graphState.edges, initialEntityIds);
        graphState.setHighlightedPaths(paths);
        graphState.setIsPathMode(true);
    };

    const showEmptyState = graphState.nodes.length === 0 && !graphState.isLoading;
    const initialEntityCount = graphState.nodes.filter((n) => n.isInitialEntity).length;

    return (
        <div className="graph-view" ref={containerRef}>
            {showEmptyState && (
                <EmptyState
                    onQuickStart={async (entities) => {
                        graphState.setIsLoading(true);
                        try {
                            const { generateMap: genMap } = await import('../api');
                            const data = await genMap({ names: entities, depth: 1 }, false);
                            graphState.setNodes(data.nodes);
                            graphState.setEdges(data.edges);
                        } catch (err) {
                            console.error('Quick start error:', err);
                            graphState.setError(err instanceof Error ? err.message : 'Failed to generate graph');
                        } finally {
                            graphState.setIsLoading(false);
                        }
                    }}
                />
            )}
            {!showEmptyState && (
                <>
                    <div className="graph-controls">
                        <button
                            onClick={graphState.togglePhysics}
                            className="control-btn"
                            title={graphState.isPhysicsEnabled ? 'Freeze graph' : 'Unfreeze graph'}
                            aria-label={graphState.isPhysicsEnabled ? 'Freeze graph layout' : 'Unfreeze graph layout'}
                        >
                            {graphState.isPhysicsEnabled ? '❄️ Freeze' : '🔥 Unfreeze'}
                        </button>
                        <button onClick={fitNetwork} className="control-btn" title="Fit to screen" aria-label="Fit graph to screen">
                            🔍 Fit
                        </button>
                        {initialEntityCount >= 2 && (
                            <button
                                onClick={togglePathMode}
                                className={`control-btn${graphState.isPathMode ? ' active' : ''}`}
                                title={graphState.isPathMode ? 'Exit path mode' : 'Show shortest paths between initial entities'}
                            >
                                {graphState.isPathMode ? '✕ Paths' : '🛤️ Paths'}
                            </button>
                        )}
                        <ExportMenu fgRef={fgRef as React.RefObject<ForceGraphMethods>} graphData={{ nodes: graphState.nodes, edges: graphState.edges }} />
                    </div>
                    <div style={{ width: '100%', height: '100%' }}>
                        <ForceGraph2D
                            ref={fgRef}
                            width={dimensions.width}
                            height={dimensions.height}
                            graphData={graphData}

                            nodeLabel="title" // Uses the hover title property
                            nodeCanvasObject={drawNode}
                            nodeRelSize={1}

                            linkWidth={1}
                            linkDirectionalArrowLength={3.5}
                            linkDirectionalArrowRelPos={1}
                            linkCurvature={graphState.edgeBundling * 0.5} // react-force-graph uses linkCurvature instead of cubicBeziers

                            onNodeClick={handleNodeClick}
                            onLinkClick={handleLinkClick}
                            onBackgroundClick={handleBackgroundClick}
                            onNodeHover={(node: any) => setHoverNode(node ? node.id : null)}

                            // Custom Link Drawing overrides standard drawing entirely to allow manual width/colors based on selection
                            linkCanvasObject={drawLink}

                            // Force Engine Params
                            d3AlphaDecay={graphState.isPhysicsEnabled ? 0.0228 : 1}
                            d3VelocityDecay={0.4}
                            cooldownTicks={graphState.isPhysicsEnabled ? Infinity : 0}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
