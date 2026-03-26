'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Badge, Card, CardContent } from '@/components/ui';
import { ProjectActions } from './ProjectActions';
import { LibrarySelectModal } from './LibrarySelectModal';
import { getProject, getEntries } from '@/lib/storage';
import type { Project, Entry } from '@/types';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshEntries = useCallback(async () => {
    const allEntries = await getEntries();
    const projectEntries = allEntries
      .filter((e: Entry) => e.project_id === params.id)
      .sort((a: Entry, b: Entry) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setEntries(projectEntries);
  }, [params.id]);

  useEffect(() => {
    const id = params.id as string;
    (async () => {
      const foundProject = await getProject(id);
      if (!foundProject) {
        router.push('/app/projects');
        return;
      }
      setProject(foundProject);
      refreshEntries();
      setLoading(false);
    })();
  }, [params.id, router, refreshEntries]);

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const creatures = entries.filter(e => e.type === 'creature');
  const notes = entries.filter(e => e.type === 'adventure_note');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <Link href="/app/projects" className="hover:text-accent transition-colors">
              Projects
            </Link>
            <span>/</span>
            <span>{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-text-muted">{project.description}</p>
          )}
        </div>
        <div className="w-full shrink-0 sm:w-auto flex justify-end">
          <ProjectActions project={project} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm">
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">{entries.length}</p>
              <p className="text-sm text-text-muted">Total Entries</p>
            </div>
          </CardContent>
        </Card>
        <Card padding="sm">
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">{creatures.length}</p>
              <p className="text-sm text-text-muted">Creatures</p>
            </div>
          </CardContent>
        </Card>
        <Card padding="sm">
          <CardContent>
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">{notes.length}</p>
              <p className="text-sm text-text-muted">Notes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Entries</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4 sm:justify-end">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="min-h-[44px] w-full text-left text-sm font-medium text-accent hover:text-accent-hover transition-colors sm:min-h-0 sm:w-auto"
          >
            Add from Library
          </button>
          <Link
            href={`/app/convert?project=${project.id}`}
            className="inline-flex min-h-[44px] w-full items-center text-sm font-medium text-accent hover:text-accent-hover transition-colors sm:min-h-0 sm:w-auto"
          >
            Add new creature
          </Link>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-text-muted mb-4">No entries in this project yet.</p>
            <Link
              href={`/app/convert?project=${project.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-bg-base font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add First Creature
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/app/entries/${entry.id}`}>
              <Card className="hover:border-accent/50 transition-colors cursor-pointer" padding="sm">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={entry.type === 'creature' ? 'accent' : 'default'}>
                        {entry.type === 'creature' ? 'Creature' : 'Note'}
                      </Badge>
                      <span className="font-medium text-text-primary">{entry.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.tags?.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="default">{tag}</Badge>
                      ))}
                      <span className="text-xs text-text-muted">
                        {new Date(entry.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <LibrarySelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={project.id}
        onAdded={refreshEntries}
      />
    </div>
  );
}
