'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui';
import { CreateProjectButton } from './CreateProjectButton';
import { getProjects, getEntries } from '@/lib/storage';
import type { Project, Entry } from '@/types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<(Project & { entryCount: number })[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [allProjects, allEntries] = await Promise.all([getProjects(), getEntries()]);
      if (cancelled) return;
      const projectsWithCounts = allProjects.map(project => ({
        ...project,
        entryCount: allEntries.filter((e: Entry) => e.project_id === project.id).length,
      }));
      setProjects(projectsWithCounts.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ));
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
          <p className="mt-1 text-text-muted">Organize your creatures and notes by campaign or conversion job.</p>
        </div>
        <CreateProjectButton onCreated={triggerRefresh} />
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-text-primary mb-2">No projects yet</h3>
            <p className="text-text-muted mb-4">Create your first project to start organizing your content.</p>
            <CreateProjectButton onCreated={triggerRefresh} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/app/projects/${project.id}`}>
              <Card className="h-full hover:border-accent/50 transition-colors cursor-pointer">
                <CardContent>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-3">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{project.entryCount} entries</span>
                    <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
