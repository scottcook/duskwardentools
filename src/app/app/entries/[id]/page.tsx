'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Badge, Card, CardContent, ThreatBadge } from '@/components/ui';
import { EntryActions } from './EntryActions';
import { CreatureCard } from '@/components/features/CreatureCard';
import { getEntry, getProject } from '@/lib/storage';
import type { Entry, Project, OutputCreatureData, ThreatTier } from '@/types';

export default function EntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    (async () => {
      const foundEntry = await getEntry(id);
      if (!foundEntry) {
        router.push('/app/library');
        return;
      }
      setEntry(foundEntry);
      if (foundEntry.project_id) {
        const foundProject = await getProject(foundEntry.project_id);
        setProject(foundProject || null);
      }
      setLoading(false);
    })();
  }, [params.id, router]);

  if (loading || !entry) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  const outputData = entry.output_json as OutputCreatureData | null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <Link href="/app/library" className="hover:text-accent transition-colors">
              Library
            </Link>
            <span>/</span>
            <span>{entry.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">{entry.title}</h1>
            <Badge variant={entry.type === 'creature' ? 'accent' : 'default'}>
              {entry.type === 'creature' ? 'Creature' : 'Note'}
            </Badge>
            {outputData?.threatTier && (
              <ThreatBadge tier={outputData.threatTier as ThreatTier} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {project && (
              <Link href={`/app/projects/${project.id}`}>
                <Badge variant="default" className="hover:bg-bg-elevated transition-colors">
                  {project.name}
                </Badge>
              </Link>
            )}
            {entry.tags?.map((tag: string) => (
              <Badge key={tag} variant="default">{tag}</Badge>
            ))}
          </div>
        </div>
        <EntryActions entry={entry} />
      </div>

      {entry.type === 'creature' && outputData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Converted Stat Block</h2>
            <CreatureCard data={outputData} />
          </div>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Source Text</h2>
              <Card>
                <CardContent>
                  <pre className="text-sm text-text-muted whitespace-pre-wrap font-mono">
                    {entry.source_text || 'No source text'}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : entry.type === 'adventure_note' ? (
        <Card>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              <pre className="text-text-primary whitespace-pre-wrap">
                {entry.source_text || 'No content'}
              </pre>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-text-muted mb-4">This creature hasn&apos;t been converted yet.</p>
            <Link
              href={`/app/convert?entry=${entry.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-bg-base font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              Convert Now
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-text-muted">
        Created {new Date(entry.created_at).toLocaleString()} · 
        Updated {new Date(entry.updated_at).toLocaleString()}
      </div>
    </div>
  );
}
