'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ArrowRight, ArrowLeft, ArrowRightLeft, Search, Loader2, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LineageNode {
  id: string;
  title: string;
  gr_number: string | null;
  upload_date: string | null;
  category: string;
  status: string;
}

interface LineageEdge {
  id: string;
  source_gr_id: string;
  target_gr_id: string | null;
  unresolved_reference: string | null;
  relationship_type: 'supersedes' | 'amends' | 'references' | 'clarifies';
  confidence: number;
  extracted_text: string | null;
}

interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

const relationshipColors = {
  supersedes: 'border-red-500 text-red-600 bg-red-500/10',
  amends: 'border-amber-500 text-amber-600 bg-amber-500/10',
  clarifies: 'border-blue-500 text-blue-600 bg-blue-500/10',
  references: 'border-zinc-500 text-zinc-600 bg-zinc-500/10',
};

const relationshipLabels = {
  supersedes: 'Supersedes',
  amends: 'Amends',
  clarifies: 'Clarifies',
  references: 'References',
};

export function GRTimeline({ docId }: { docId: string }) {
  const [data, setData] = useState<LineageGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchLineage() {
      setLoading(true);
      setError(null);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
        const response = await fetch(`${API_BASE}/documents/${docId}/lineage`);
        if (!response.ok) {
          throw new Error('Failed to fetch lineage data');
        }
        const graph = await response.json();
        setData(graph);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchLineage();
  }, [docId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/30 rounded-xl border border-border">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-sm">Analyzing policy lineage...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
        {error || 'Failed to load timeline'}
      </div>
    );
  }

  if (data.nodes.length <= 1 && data.edges.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground bg-muted/30 rounded-xl border border-border">
        <FileText className="w-8 h-8 mx-auto mb-3 opacity-20" />
        <p>No related resolutions found for this document.</p>
        <p className="text-xs opacity-70 mt-1">Our AI hasn't detected any references to other GRs.</p>
      </div>
    );
  }

  // Very simple horizontal layout strategy:
  // Root node is docId. Incoming edges are older docs. Outgoing are newer (usually).
  // Actually, if doc A supersedes doc B, doc A is newer. 
  // Source is the one containing the text. Target is the one being referenced.
  // So Source is always newer than Target.
  
  // Let's sort nodes by their upload_date if available, or just put target nodes on left, source on right.
  const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
  
  const content = (
    <>
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          Policy Lineage Graph
        </h3>
        <button 
          onClick={() => setIsMaximized(!isMaximized)}
          className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors"
          title={isMaximized ? "Minimize" : "Maximize"}
        >
          {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      
      <div 
        ref={containerRef}
        className={cn(
          "p-6 overflow-x-auto custom-scrollbar relative flex items-center gap-12",
          isMaximized ? "h-[calc(100vh-120px)] items-start pt-12" : "min-h-[300px]"
        )}
      >
        {/* Render edges */}
        <div className="flex gap-8 items-stretch w-full pb-4">
          {data.edges.map((edge, idx) => {
            const sourceNode = nodeMap.get(edge.source_gr_id);
            const targetNode = edge.target_gr_id ? nodeMap.get(edge.target_gr_id) : null;
            
            return (
              <motion.div 
                key={edge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col gap-3 min-w-[280px]"
              >
                {/* Source Node */}
                {sourceNode && (
                  <div className={cn(
                    "p-4 rounded-xl border bg-card shadow-sm transition-all relative",
                    sourceNode.id === docId ? "border-primary ring-1 ring-primary/20" : "border-border"
                  )}>
                    {sourceNode.id === docId && (
                      <div className="absolute -top-2.5 -right-2.5 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Current
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground font-medium mb-1 truncate">
                      {sourceNode.gr_number || 'Unknown GR No.'}
                    </div>
                    <div className="text-sm font-medium line-clamp-2 mb-2 leading-tight">
                      {sourceNode.title}
                    </div>
                    {sourceNode.upload_date && (
                      <div className="text-[11px] text-muted-foreground flex justify-between">
                        <span>{new Date(sourceNode.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="capitalize">{sourceNode.category}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Edge Label */}
                <div className="flex flex-col items-center justify-center py-2 relative">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-border -z-10" />
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    relationshipColors[edge.relationship_type]
                  )}>
                    {relationshipLabels[edge.relationship_type]}
                  </div>
                  {edge.extracted_text && (
                    <div className="mt-3 text-[11px] italic text-muted-foreground text-center bg-muted/50 p-2 rounded border border-border">
                      "{edge.extracted_text}"
                    </div>
                  )}
                  <ArrowRight className="w-4 h-4 text-muted-foreground mt-2" />
                </div>
                
                {/* Target Node */}
                {targetNode ? (
                  <div className={cn(
                    "p-4 rounded-xl border bg-card shadow-sm transition-all",
                    targetNode.id === docId ? "border-primary ring-1 ring-primary/20" : "border-border"
                  )}>
                    <div className="text-xs text-muted-foreground font-medium mb-1 truncate">
                      {targetNode.gr_number || 'Unknown GR No.'}
                    </div>
                    <div className="text-sm font-medium line-clamp-2 mb-2 leading-tight">
                      {targetNode.title}
                    </div>
                    {targetNode.upload_date && (
                      <div className="text-[11px] text-muted-foreground flex justify-between">
                        <span>{new Date(targetNode.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="capitalize">{targetNode.category}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-center h-[120px]">
                    <Search className="w-5 h-5 text-muted-foreground/50 mb-2" />
                    <div className="text-xs font-medium text-muted-foreground mb-1">Unresolved Reference</div>
                    <div className="text-[11px] text-muted-foreground/80 font-mono bg-background px-2 py-1 rounded border">
                      {edge.unresolved_reference}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Inline View */}
      {!isMaximized && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {content}
        </div>
      )}

      {/* Maximized Modal View */}
      <AnimatePresence>
        {isMaximized && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsMaximized(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full h-full max-w-7xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
