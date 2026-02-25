'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Card, Badge } from '@/components/ui';
import { getEntries, updateEntry } from '@/lib/storage';
import type { Entry } from '@/types';

interface LibrarySelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onAdded: () => void;
}

export function LibrarySelectModal({ isOpen, onClose, projectId, onAdded }: LibrarySelectModalProps) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            if (!isOpen) return;
            await Promise.resolve(); // Yield to avoid synchronous setState side effect warning
            if (!active) return;

            setLoading(true);
            const allEntries = await getEntries();
            if (!active) return;

            // Filter out entries already in this project
            const available = allEntries.filter(e => e.project_id !== projectId && e.type === 'creature');
            setEntries(available);
            setLoading(false);
            setSelectedIds(new Set());
        };

        loadData();

        return () => {
            active = false;
        };
    }, [isOpen, projectId]);

    const handleAdd = async () => {
        if (selectedIds.size === 0) return;
        setSaving(true);
        try {
            // update all selected entries to have this project_id
            await Promise.all(
                Array.from(selectedIds).map(id => updateEntry(id, { project_id: projectId }))
            );
            onAdded();
            onClose();
        } catch (err) {
            console.error('Failed to add entries to project:', err);
        }
        setSaving(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add from Library" size="lg">
            <div className="space-y-4">
                {loading ? (
                    <p className="text-text-muted py-8 text-center">Loading library...</p>
                ) : entries.length === 0 ? (
                    <p className="text-text-muted py-8 text-center">No available creatures in your library to add.</p>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                        {entries.map(entry => (
                            <div
                                key={entry.id}
                                onClick={() => {
                                    const newSet = new Set(selectedIds);
                                    if (newSet.has(entry.id)) newSet.delete(entry.id);
                                    else newSet.add(entry.id);
                                    setSelectedIds(newSet);
                                }}
                            >
                                <Card
                                    className={`cursor-pointer hover:border-accent transition-colors ${selectedIds.has(entry.id) ? 'ring-2 ring-accent border-transparent' : ''}`}
                                >
                                    <div className="p-3 flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(entry.id)}
                                            readOnly
                                            className="w-4 h-4 rounded border-border text-accent"
                                        />
                                        <div>
                                            <h4 className="font-medium text-text-primary">{entry.title}</h4>
                                            <div className="flex gap-2 mt-1">
                                                {entry.tags?.slice(0, 3).map((tag: string) => (
                                                    <Badge key={tag} variant="default">{tag}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={saving || selectedIds.size === 0} loading={saving}>
                        Add {selectedIds.size > 0 ? selectedIds.size : ''} Creatures
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
