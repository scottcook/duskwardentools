'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui';
import { getEntriesCount, getRecentEntries } from '@/lib/storage';
import type { Entry } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState({ projects: 0, creatures: 0, notes: 0 });
  const [loading, setLoading] = useState(true);
  const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    getEntriesCount().then(s => { setStats(s); setLoading(false); });
    getRecentEntries(5).then(e => { setRecentEntries(e); setLoadingRecent(false); });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="mt-1 text-text-muted">Welcome to your creature conversion workbench.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Projects</p>
                <p className="text-3xl font-bold text-text-primary">
                  {loading ? <span className="animate-pulse bg-border text-transparent rounded px-2">00</span> : stats.projects}
                </p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Creatures</p>
                <p className="text-3xl font-bold text-text-primary">
                  {loading ? <span className="animate-pulse bg-border text-transparent rounded px-2">00</span> : stats.creatures}
                </p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted">Adventure Notes</p>
                <p className="text-3xl font-bold text-text-primary">{stats.notes}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Quick Actions</CardTitle>
          </div>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/app/projects"
                className="flex flex-col items-center gap-2 p-4 bg-accent rounded-lg hover:bg-accent-hover border border-accent transition-colors group focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <svg className="w-8 h-8 text-bg-base/80 group-hover:text-bg-base transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm font-medium text-bg-base">New Project</span>
              </Link>

              <Link
                href="/app/convert"
                className="flex flex-col items-center gap-2 p-4 bg-bg-elevated rounded-lg hover:bg-bg-base border border-border transition-colors group focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <svg className="w-8 h-8 text-text-muted group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium text-text-primary">Convert Creature</span>
              </Link>

              <Link
                href="/app/library"
                className="flex flex-col items-center gap-2 p-4 bg-bg-elevated rounded-lg hover:bg-bg-base border border-border transition-colors group focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <svg className="w-8 h-8 text-text-muted group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm font-medium text-text-primary">Search Library</span>
              </Link>

              <Link
                href="/app/library"
                className="flex flex-col items-center gap-2 p-4 bg-bg-elevated rounded-lg hover:bg-bg-base border border-border transition-colors group focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <svg className="w-8 h-8 text-text-muted group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-sm font-medium text-text-primary">Browse All</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Recent Entries</CardTitle>
            <Link href="/app/library" className="text-sm text-accent hover:text-accent-hover transition-colors">
              View all
            </Link>
          </div>
          <CardContent>
            {loadingRecent ? (
              <div className="py-12 flex justify-center text-text-muted animate-pulse">Loading recent activity...</div>
            ) : recentEntries.length === 0 ? (
              <p className="text-text-muted text-sm">No entries yet. Start by converting a creature!</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentEntries.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`/app/entries/${entry.id}`}
                      className="flex items-center justify-between py-3 hover:bg-bg-elevated -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${entry.type === 'creature' ? 'bg-accent' : 'bg-text-muted'}`} />
                        <span className="text-sm font-medium text-text-primary">{entry.title}</span>
                      </div>
                      <span className="text-xs text-text-muted">
                        {new Date(entry.updated_at).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
