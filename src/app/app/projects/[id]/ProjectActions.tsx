'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProject, deleteProject } from '@/lib/storage';
import { Button, Input, Textarea, Modal } from '@/components/ui';
import type { Project } from '@/types';

interface ProjectActionsProps {
  project: Project;
}

export function ProjectActions({ project }: ProjectActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || null,
      });

      setIsEditOpen(false);
      router.refresh();
    } catch {
      setError('Failed to update project');
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      await deleteProject(project.id);
      router.push('/app/projects');
    } catch {
      setError('Failed to delete project');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(true)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(true)}>
          <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error && !name.trim() ? error : undefined}
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          {error && name.trim() && (
            <p className="text-sm text-error">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Project">
        <div className="space-y-4">
          <p className="text-text-muted">
            Are you sure you want to delete <strong className="text-text-primary">{project.name}</strong>?
            This will not delete the entries, but they will no longer be associated with this project.
          </p>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={loading}>
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
