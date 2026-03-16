'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input, Select, Card, Badge, ThreatBadge, useToast } from '@/components/ui';
import { getEntries, getProjects, updateEntry } from '@/lib/storage';
import type { Entry, Project, OutputCreatureData } from '@/types';

function LibraryPageContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getEntries().then(setEntries);
    getProjects().then(setProjects);
  }, []);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (typeFilter && (typeFilter === 'creature' || typeFilter === 'adventure_note')) {
      result = result.filter(e => e.type === typeFilter);
    }

    if (projectFilter) {
      result = result.filter(e => e.project_id === projectFilter);
    }

    if (search) {
      const query = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(query) ||
        (e.source_text && e.source_text.toLowerCase().includes(query))
      );
    }

    return result.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [entries, search, typeFilter, projectFilter]);

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'creature', label: 'Creatures' },
    { value: 'adventure_note', label: 'Adventure Notes' },
  ];

  const projectOptions = [
    { value: '', label: 'All Projects' },
    ...projects.map(p => ({ value: p.id, label: p.name })),
  ];

  const getProjectLabel = useCallback((projectId: string | null) => {
    if (!projectId) return 'project';
    return projects.find((p) => p.id === projectId)?.name ?? 'project';
  }, [projects]);

  const assignEntryToProject = useCallback(async (entryId: string, projectId: string | null) => {
    let previousProjectId: string | null = null;

    setEntries((prev) => prev.map((entry) => {
      if (entry.id !== entryId) return entry;
      previousProjectId = entry.project_id;
      return { ...entry, project_id: projectId };
    }));

    try {
      const updated = await updateEntry(entryId, { project_id: projectId });
      if (!updated) throw new Error('Entry update returned no data');

      addToast(
        projectId ? 'success' : 'info',
        projectId
          ? `Added to ${getProjectLabel(projectId)}`
          : 'Removed from project'
      );
    } catch (error) {
      console.error('Failed to update entry project:', error);
      setEntries((prev) => prev.map((entry) =>
        entry.id === entryId ? { ...entry, project_id: previousProjectId } : entry
      ));
      addToast('error', 'Could not update project');
    }
  }, [addToast, getProjectLabel]);

  const handleBulkProjectMove = useCallback(async (projectId: string | null) => {
    if (selectedIds.size === 0) return;

    const selectedIdsSnapshot = Array.from(selectedIds);
    const previousProjectIds = new Map<string, string | null>();

    setEntries((prev) => prev.map((entry) => {
      if (!selectedIds.has(entry.id)) return entry;
      previousProjectIds.set(entry.id, entry.project_id);
      return { ...entry, project_id: projectId };
    }));

    try {
      const results = await Promise.all(
        selectedIdsSnapshot.map(async (id) => {
          const updated = await updateEntry(id, { project_id: projectId });
          if (!updated) throw new Error(`Entry ${id} update returned no data`);
          return updated;
        })
      );

      if (results.length !== selectedIdsSnapshot.length) {
        throw new Error('Bulk project update was incomplete');
      }

      addToast(
        projectId ? 'success' : 'info',
        projectId
          ? `Added ${selectedIdsSnapshot.length} items to ${getProjectLabel(projectId)}`
          : `Removed ${selectedIdsSnapshot.length} items from project`
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to bulk update projects:', error);
      setEntries((prev) => prev.map((entry) => (
        previousProjectIds.has(entry.id)
          ? { ...entry, project_id: previousProjectIds.get(entry.id) ?? null }
          : entry
      )));
      addToast('error', 'Could not update all selected projects');
    }
  }, [addToast, getProjectLabel, selectedIds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Library</h1>
        <p className="mt-1 text-text-muted">Browse and search your creatures and notes.</p>
      </div>

      <div className="flex flex-col gap-3">
        <Input
          placeholder="Search entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 sm:w-40 sm:flex-none"
          />
          <Select
            options={projectOptions}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="flex-1 sm:w-40 sm:flex-none"
          />
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-text-muted">No entries found.</p>
            <Link href="/app/convert" className="text-accent hover:text-accent-hover mt-2 inline-block">
              Convert your first creature
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => {
            const outputData = entry.output_json as OutputCreatureData | null;

            return (
              <div key={entry.id} className="relative group">
                <div className="absolute top-2.5 left-2.5 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [&:has(:checked)]:opacity-100 transition-opacity">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entry.id)}
                    onChange={(e) => {
                      const newSet = new Set(selectedIds);
                      if (e.target.checked) newSet.add(entry.id);
                      else newSet.delete(entry.id);
                      setSelectedIds(newSet);
                    }}
                    className="w-5 h-5 cursor-pointer rounded border-border text-accent focus:ring-accent"
                    aria-label={`Select ${entry.title}`}
                  />
                </div>
                <Link href={`/app/entries/${entry.id}`} onClick={(e) => {
                  // If clicking near checkbox, don't navigate
                  if ((e.target as HTMLElement).tagName === 'INPUT') {
                    e.preventDefault();
                  }
                }}>
                  <Card className={`h-full hover:border-accent transition-colors pl-10 cursor-pointer ${selectedIds.has(entry.id) ? 'ring-2 ring-accent border-transparent' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-text-primary truncate">{entry.title}</h3>
                      <Badge variant={entry.type === 'creature' ? 'accent' : 'default'}>
                        {entry.type === 'creature' ? 'Creature' : 'Note'}
                      </Badge>
                    </div>

                    {entry.type === 'creature' && outputData?.threatTier && (
                      <div className="mb-2">
                        <ThreatBadge tier={outputData.threatTier} />
                      </div>
                    )}

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="default">{tag}</Badge>
                        ))}
                        {entry.tags.length > 3 && (
                          <Badge variant="default">+{entry.tags.length - 3}</Badge>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-3 flex flex-col gap-1.5">
                      {projects.length > 0 && (
                        <div onClick={(e) => e.preventDefault()}>
                          <select
                            className="w-full text-xs bg-bg-elevated border border-border rounded px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer hover:border-accent/50 transition-colors"
                            value={entry.project_id || ""}
                            onChange={(e) => {
                              void assignEntryToProject(entry.id, e.target.value || null);
                            }}
                          >
                            <option value="">{entry.project_id ? "None" : "Add to project..."}</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <p className="text-xs text-text-muted">
                        Updated {new Date(entry.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto z-50 bg-bg-elevated border border-border rounded-2xl shadow-lg px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom-5">
          <span className="text-sm font-medium text-text-primary shrink-0">
            {selectedIds.size} selected
          </span>
          <div className="hidden sm:block w-px h-4 bg-border" />
          
          {projects.length > 0 && (
            <div className="flex items-center">
              <select
                className="text-sm font-medium text-text-secondary bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer appearance-none hover:text-text-primary transition-colors"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    void handleBulkProjectMove(val === 'none' ? null : val);
                  }
                }}
              >
                <option value="" disabled>Move to project...</option>
                <option value="none">Remove from project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <svg className="w-4 h-4 text-text-muted pointer-events-none -ml-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}

          <div className="hidden sm:block w-px h-4 bg-border" />

          <button
            onClick={() => {
              const idsParam = Array.from(selectedIds).join(',');
              window.open(`/app/print?ids=${idsParam}`, '_blank');
              setSelectedIds(new Set());
            }}
            className="text-sm font-medium text-accent hover:text-accent-hover flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-sm text-text-muted hover:text-text-primary transition-colors shrink-0"
            aria-label="Clear selection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Loading...</p>
      </div>
    }>
      <LibraryPageContent />
    </Suspense>
  );
}
