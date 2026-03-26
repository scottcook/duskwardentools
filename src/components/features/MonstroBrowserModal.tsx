'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Input, Select, Card, Badge } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';
import type { SourceSystem } from '@/types';

interface MonstroIndexItem {
  title: string;
  slug: string;
  description?: string | null;
  type?: string | null;
  biome?: string | null;
  sourcebooks?: string[];
  url?: string;
}

interface MonstroPortrayal {
  'dc:source'?: string;
  description?: string | null;
  specialAbilities?: Array<{ name?: string; description?: string | null }> | null;
  stats?: Record<string, unknown> | null;
  'fabio:isPartOf'?: {
    '@id'?: string;
    'schema:name'?: string;
  };
}

interface MonstroDetail {
  slug: string;
  'schema:name'?: string;
  'schema:description'?: string;
  'schema:url'?: string;
  'fabio:hasPortrayal'?: MonstroPortrayal[];
}

interface MonstroBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    text: string,
    system: SourceSystem,
    description?: string,
    external?: { source: 'monstro'; slug?: string; url?: string }
  ) => void;
}

const SOURCEBOOK_OPTIONS = [
  { value: '', label: 'All Sourcebooks' },
  { value: 'bfrpg', label: 'Basic Fantasy RPG' },
  { value: 'ose', label: 'Old-School Essentials' },
  { value: 'carcass-crawler', label: 'Carcass Crawler' },
  { value: 'osric', label: 'OSRIC' },
  { value: 'field-guide-omnibus', label: 'Field Guide' },
];

function formatSourcebookLabel(slug?: string): string | undefined {
  if (!slug) return undefined;
  const match = SOURCEBOOK_OPTIONS.find(option => option.value === slug);
  return match?.label ?? slug.replace(/-/g, ' ');
}

function sourcebookToSystem(sourcebook?: string): SourceSystem {
  const normalized = (sourcebook ?? '').toLowerCase();
  if (normalized.includes('bfrpg') || normalized.includes('basic fantasy')) return 'bfrpg';
  if (normalized.includes('ose') || normalized.includes('old-school essentials') || normalized.includes('carcass-crawler')) return 'ose';
  if (normalized.includes('osric')) return 'other';
  return 'other';
}

function toLine(label: string, value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return `${label}: ${value.join(', ')}`;
  }
  const text = String(value).trim();
  return text ? `${label}: ${text}` : null;
}

function buildStatblockText(name: string, portrayal: MonstroPortrayal): string {
  const stats = portrayal.stats ?? {};
  const lines = [
    name,
    toLine('Armor Class', stats.armorClass),
    toLine('Hit Dice', stats.hitDice),
    toLine('Movement', stats.movement ?? stats.move),
    toLine('Attacks', stats.attacks),
    toLine('Damage', stats.damage),
    toLine('Saving Throws', stats.savingThrows),
    toLine('Save As', stats.saveAs),
    toLine('THAC0', stats.thac0),
    toLine('Morale', stats.morale),
    toLine('Alignment', stats.alignment),
    toLine('Number Appearing', stats.numberAppearing ?? stats.numberEncountered),
    toLine('Treasure Type', stats.treasureType),
    toLine('XP', stats.xp),
    portrayal.description ? String(portrayal.description).trim() : null,
    ...(portrayal.specialAbilities ?? []).flatMap(ability => {
      const abilityName = ability.name?.trim();
      const abilityDescription = ability.description?.trim();
      return abilityName && abilityDescription ? [`${abilityName}: ${abilityDescription}`] : [];
    }),
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n');
}

export function MonstroBrowserModal({ isOpen, onClose, onSelect }: MonstroBrowserModalProps) {
  const [search, setSearch] = useState('');
  const [sourcebookFilter, setSourcebookFilter] = useState('');
  const [monsters, setMonsters] = useState<MonstroIndexItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectingSlug, setSelectingSlug] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const loadMonsters = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('https://monstro.cc/monster/index.json');
        if (!res.ok) throw new Error('Failed to load monsters');
        const data = (await res.json()) as { items?: MonstroIndexItem[] };
        setMonsters(Array.isArray(data.items) ? data.items : []);
        trackEvent('monstro_browser_opened');
      } catch (err) {
        setError('Could not load monster list. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMonsters();
  }, [isOpen]);

  const filteredMonsters = useMemo(() => {
    let result = monsters;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(monster =>
        monster.title.toLowerCase().includes(q) ||
        monster.type?.toLowerCase().includes(q) ||
        monster.biome?.toLowerCase().includes(q)
      );
    }

    if (sourcebookFilter) {
      result = result.filter(monster =>
        (monster.sourcebooks ?? []).some(sourcebook => sourcebook.includes(sourcebookFilter))
      );
    }

    return result.slice(0, 50);
  }, [monsters, search, sourcebookFilter]);

  const handleSelect = useCallback(async (monster: MonstroIndexItem) => {
    setSelectingSlug(monster.slug);
    try {
      const detailRes = await fetch(`https://monstro.cc/monster/${monster.slug}/index.json`);
      if (!detailRes.ok) throw new Error('Failed to load monster details');

      const detail = (await detailRes.json()) as MonstroDetail;
      const portrayals = Array.isArray(detail['fabio:hasPortrayal']) ? detail['fabio:hasPortrayal'] : [];
      const preferredPortrayal =
        portrayals.find(p => {
          const sourceId = p['fabio:isPartOf']?.['@id']?.toLowerCase() ?? '';
          return sourcebookFilter ? sourceId.includes(sourcebookFilter) : false;
        }) ??
        portrayals.find(p => sourcebookToSystem(p['dc:source']) !== 'other') ??
        portrayals[0];

      const system = sourcebookToSystem(
        preferredPortrayal?.['dc:source'] ??
          preferredPortrayal?.['fabio:isPartOf']?.['schema:name'] ??
          monster.sourcebooks?.[0]
      );

      const text = preferredPortrayal
        ? buildStatblockText(detail['schema:name'] ?? monster.title, preferredPortrayal)
        : `${monster.title}\n${monster.description ?? ''}`.trim();

      const description =
        preferredPortrayal?.description?.trim() ||
        detail['schema:description']?.trim() ||
        monster.description?.trim() ||
        undefined;

      onSelect(text, system, description, {
        source: 'monstro',
        slug: detail.slug ?? monster.slug,
        url: detail['schema:url'] ?? monster.url,
      });

      trackEvent('monstro_monster_selected', { slug: monster.slug, name: monster.title });
      onClose();
    } catch (err) {
      console.error('Failed to load monster details:', err);
      setError('Could not import that monster right now. Please try another one.');
    } finally {
      setSelectingSlug(null);
    }
  }, [onClose, onSelect, sourcebookFilter]);

  const handleClose = useCallback(() => {
    setSearch('');
    setSourcebookFilter('');
    setError('');
    setSelectingSlug(null);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Browse Monstro.cc" size="xl">
      <div className="space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2.5">
          <Input
            placeholder="Search monsters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select
            options={SOURCEBOOK_OPTIONS}
            value={sourcebookFilter}
            onChange={(e) => setSourcebookFilter(e.target.value)}
            className="sm:w-56"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-error/30 bg-error/5 p-2.5 text-sm text-error sm:p-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid max-h-[420px] auto-rows-min grid-cols-1 gap-1.5 overflow-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMonsters.length === 0 ? (
              <div className="col-span-full text-center py-6 text-text-muted">
                No monsters found. Try a different search term.
              </div>
            ) : (
              filteredMonsters.map((monster) => (
                <Card key={monster.slug} padding="none" className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleSelect(monster)}
                    className="w-full px-3 py-2.5 text-left transition-colors hover:bg-bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-sm font-semibold leading-snug text-text-primary">
                        {monster.title}
                      </div>
                      {selectingSlug === monster.slug && (
                        <div className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-text-muted">
                      {monster.type && <Badge variant="default" className="px-1.5 py-0 text-[11px]">{monster.type}</Badge>}
                      {monster.biome && <span className="text-text-muted/80">{monster.biome}</span>}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-text-muted/60">
                      {formatSourcebookLabel(monster.sourcebooks?.[0]) ?? 'Unknown source'}
                    </div>
                    {monster.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-text-muted/80">
                        {monster.description}
                      </p>
                    )}
                  </button>
                </Card>
              ))
            )}
          </div>
        )}

        <div className="border-t border-border pt-1.5 text-[10px] text-text-muted">
          Data from{' '}
          <a
            href="https://monstro.cc"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            monstro.cc
          </a>{' '}
          — an independent OSR bestiary with JSON API access.
        </div>
      </div>
    </Modal>
  );
}
