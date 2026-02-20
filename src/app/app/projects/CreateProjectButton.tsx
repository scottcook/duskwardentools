'use client';

import { useState } from 'react';
import { saveProject } from '@/lib/storage';
import { Button, Input, Textarea, Modal } from '@/components/ui';

interface CreateProjectButtonProps {
  onCreated?: () => void;
}

export function CreateProjectButton({ onCreated }: CreateProjectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await saveProject({
        name: name.trim(),
        description: description.trim() || null,
      });

      setIsOpen(false);
      setName('');
      setDescription('');
      onCreated?.();
    } catch {
      setError('Failed to create project');
    }

    setLoading(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Project
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Campaign"
            error={error && !name.trim() ? error : undefined}
            autoFocus
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={3}
          />

          {error && name.trim() && (
            <p className="text-sm text-error">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
