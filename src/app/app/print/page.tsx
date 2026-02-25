'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreatureCard } from '@/components/features/CreatureCard';
import { getEntry } from '@/lib/storage';
import type { Entry, OutputCreatureData } from '@/types';

function PrintPageContent() {
    const searchParams = useSearchParams();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const loadIds = async () => {
            await Promise.resolve(); // Yield to avoid synchronous setState side effect warning
            if (!active) return;

            const ids = searchParams.get('ids')?.split(',') || [];
            if (ids.length === 0) {
                setLoading(false);
                return;
            }

            const results = await Promise.all(ids.map(id => getEntry(id)));
            if (!active) return;

            setEntries(results.filter((e): e is Entry => e !== null));
            setLoading(false);

            // Wait for rendering to complete before triggering print dialog
            setTimeout(() => {
                window.print();
            }, 500);
        };

        loadIds();

        return () => {
            active = false;
        };
    }, [searchParams]);

    if (loading) {
        return <div className="p-8 text-center text-text-muted">Preparing for print...</div>;
    }

    if (entries.length === 0) {
        return <div className="p-8 text-center text-text-muted">No items selected for printing.</div>;
    }

    return (
        <div className="bg-white min-h-screen print:bg-white text-black p-8 space-y-8 print:p-0">
            <div className="print:hidden mb-8 space-y-4">
                <h1 className="text-2xl font-bold">Print Preview</h1>
                <p className="text-sm text-text-muted">Use your browser&apos;s print dialog. Adjust scaling to fit if necessary.</p>
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors"
                >
                    Print Now
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                {entries.map(entry => {
                    const outputData = entry.output_json as OutputCreatureData | null;
                    if (entry.type !== 'creature' || !outputData) return null;

                    return (
                        <div key={entry.id} className="break-inside-avoid">
                            <CreatureCard data={outputData} showPrintStyles={true} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function PrintPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading...</div>}>
            <PrintPageContent />
        </Suspense>
    );
}
