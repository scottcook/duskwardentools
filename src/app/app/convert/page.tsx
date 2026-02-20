'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ConversionWizard } from './ConversionWizard';
import { getProjects, getEntry } from '@/lib/storage';
import type { Project, Entry } from '@/types';

function ConvertPageContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [ready, setReady] = useState(false);

  const defaultProjectId = searchParams.get('project') || undefined;
  const entryId = searchParams.get('entry') || undefined;

  useEffect(() => {
    (async () => {
      const [projectList, entry] = await Promise.all([
        getProjects(),
        entryId ? getEntry(entryId) : Promise.resolve(undefined),
      ]);
      setProjects(projectList);
      setExistingEntry(entry ?? null);
      setReady(true);
    })();
  }, [entryId]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <ConversionWizard 
      projects={projects.map(p => ({ id: p.id, name: p.name }))} 
      defaultProjectId={defaultProjectId}
      existingEntry={existingEntry}
    />
  );
}

export default function ConvertPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Loading...</p>
      </div>
    }>
      <ConvertPageContent />
    </Suspense>
  );
}
