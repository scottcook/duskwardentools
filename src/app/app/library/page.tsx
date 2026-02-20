'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input, Select, Card, Badge, ThreatBadge } from '@/components/ui';
import { getEntries, getProjects } from '@/lib/storage';
import type { Entry, Project, OutputCreatureData } from '@/types';

function LibraryPageContent() {
  const searchParams = useSearchParams();
  
  const [entries, setEntries] = useState<Entry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') || '');

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

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId)?.name;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Library</h1>
        <p className="mt-1 text-text-muted">Browse and search your creatures and notes.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-40"
          />
          <Select
            options={projectOptions}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-40"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => {
            const outputData = entry.output_json as OutputCreatureData | null;
            const projectName = getProjectName(entry.project_id);

            return (
              <Link key={entry.id} href={`/app/entries/${entry.id}`}>
                <Card className="h-full hover:border-accent transition-colors cursor-pointer">
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

                  {projectName && (
                    <p className="text-xs text-text-muted mb-2">Project: {projectName}</p>
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

                  <p className="text-xs text-text-muted mt-auto">
                    Updated {new Date(entry.updated_at).toLocaleDateString()}
                  </p>
                </Card>
              </Link>
            );
          })}
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
