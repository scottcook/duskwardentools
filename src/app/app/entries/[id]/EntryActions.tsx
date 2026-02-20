'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteEntry } from '@/lib/storage';
import { Button, Modal } from '@/components/ui';
import type { Entry } from '@/types';

interface EntryActionsProps {
  entry: Entry;
}

export function EntryActions({ entry }: EntryActionsProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const success = await deleteEntry(entry.id);
      
      if (!success) {
        setError('Failed to delete entry');
        setLoading(false);
        return;
      }

      router.push('/app/library');
    } catch {
      setError('An error occurred');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {entry.type === 'creature' && (
          <Link href={`/app/convert?entry=${entry.id}`}>
            <Button variant="secondary" size="sm">
              Re-convert
            </Button>
          </Link>
        )}
        <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)}>
          <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Entry">
        <div className="space-y-4">
          <p className="text-text-muted">
            Are you sure you want to delete <strong className="text-text-primary">{entry.title}</strong>?
            This action cannot be undone.
          </p>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={loading}>
              Delete Entry
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
