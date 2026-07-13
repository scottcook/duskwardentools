import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BEASTS, format, plain, type ForgeMonster } from '../lib/convert'
import {
  entrySourceFields,
  entrySourceSystem,
  entryToForge,
  forgeToNewCreature,
} from '../lib/creatureBridge'
import { CONVERTER_SYSTEMS, SOURCE_SYSTEMS } from '../lib/systems'
import {
  SOURCEBOOK_OPTIONS,
  fetchMonsterDetail,
  fetchMonsterIndex,
  monstroSourceText,
  monstroToForgeResult,
  pickPortrayal,
  portrayalSourcebook,
  portrayalSourceSystem,
  sourcebookSummary,
  type MonstroIndexItem,
} from '../lib/monstro'
import { api } from '../lib/api'
import { useToast } from '../components/ToastProvider'
import { D20Die } from '../components/D20Die'
import { ScribeScan } from '../components/ScribeScan'
import { parseStatBlock, systemLabelForParse } from '../lib/parseStatBlock'
import {
  getConversionWarnings,
  type ForgeField,
} from '../lib/conversionValidation'
import type { CreatureSource } from '../lib/types'

type Tab = 'scribe' | 'forge' | 'tome'

interface SourceSnapshot {
  system: string
  text: string | null
  source?: CreatureSource
  fields: string[]
}

const FORGE_FIELDS: ForgeField[] = [
  'name',
  'hd',
  'ac',
  'speed',
  'ml',
  'al',
  'kind',
  'stats',
  'saves',
  'statsOverride',
  'savesOverride',
  'atkText',
  'traitsText',
]

const FIELD_ALIASES: Record<string, ForgeField> = {
  alignment: 'al',
  morale: 'ml',
  attacks: 'atkText',
  traits: 'traitsText',
}

function normalizeSourceFields(fields: string[]): Set<ForgeField> {
  return new Set(
    fields
      .map((field) => FIELD_ALIASES[field] ?? field)
      .filter((field): field is ForgeField => FORGE_FIELDS.includes(field as ForgeField)),
  )
}

function missingFromKnown(known: ReadonlySet<ForgeField>): Set<string> {
  return new Set(FORGE_FIELDS.filter((field) => !known.has(field)))
}

function sourceFieldsForStorage(known: ReadonlySet<ForgeField>): string[] {
  return Array.from(known)
    .filter((field) => field !== 'statsOverride' && field !== 'savesOverride')
    .map((field) =>
      field === 'al'
        ? 'alignment'
        : field === 'ml'
          ? 'morale'
          : field === 'atkText'
            ? 'attacks'
            : field === 'traitsText'
              ? 'traits'
              : field,
    )
}

const SCRIBE_SAMPLE = `GHOUL
Medium undead, chaotic evil
Armor Class 12
Hit Points 9 (2d8)
Speed 30 ft.
STR 13  DEX 15  CON 10  INT 7  WIS 10  CHA 6
Actions: Claws +4 (1d4) plus paralysis; Bite +4 (1d6)
Challenge 1 (200 XP)`

export function ConverterPage() {
  const { notify } = useToast()
  const [searchParams] = useSearchParams()
  const creatureId = searchParams.get('creature')

  const [tab, setTab] = useState<Tab>('forge')
  const [src, setSrc] = useState('dnd5e')
  const [tgt, setTgt] = useState('shadowdark')
  const [sel, setSel] = useState(0)

  const [rolling, setRolling] = useState(false)
  const [face, setFace] = useState(20)
  const [flip, setFlip] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const [m, setM] = useState<ForgeMonster>({ ...BEASTS[0] })
  const [cm, setCm] = useState<ForgeMonster>({ ...BEASTS[0] })
  const [tgtDone, setTgtDone] = useState('shadowdark')
  const [scribe, setScribe] = useState(SCRIBE_SAMPLE)
  const [parseHint, setParseHint] = useState('')
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [knownSourceFields, setKnownSourceFields] = useState<Set<ForgeField>>(
    () => new Set(FORGE_FIELDS),
  )
  const [sourceText, setSourceText] = useState<string | null>(null)
  const [sourceInfo, setSourceInfo] = useState<CreatureSource | undefined>({
    provider: 'manual',
    label: "Warden's specimen",
  })
  const [convertedSource, setConvertedSource] = useState<SourceSnapshot>({
    system: 'dnd5e',
    text: null,
    source: { provider: 'manual', label: "Warden's specimen" },
    fields: sourceFieldsForStorage(new Set(FORGE_FIELDS)),
  })
  const [warningAcknowledged, setWarningAcknowledged] = useState('')
  const [loadingCreature, setLoadingCreature] = useState(false)

  const srcOverridden = useRef(false)
  const scribeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tome tab — monstro.cc bestiary
  const [tomeSearch, setTomeSearch] = useState('')
  const [tomeBook, setTomeBook] = useState('')
  const [tomeIndex, setTomeIndex] = useState<MonstroIndexItem[] | null>(null)
  const [tomeLoading, setTomeLoading] = useState(false)
  const [tomeError, setTomeError] = useState('')
  const [tomeBusySlug, setTomeBusySlug] = useState<string | null>(null)

  const iv = useRef<ReturnType<typeof setInterval> | null>(null)
  const to = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ct = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (iv.current) clearInterval(iv.current)
      if (to.current) clearTimeout(to.current)
      if (ct.current) clearTimeout(ct.current)
      if (scribeDebounce.current) clearTimeout(scribeDebounce.current)
    }
  }, [])

  useEffect(() => {
    if (!creatureId) return
    let active = true
    setLoadingCreature(true)

    void api
      .getCreature(creatureId)
      .then((entry) => {
        if (!active) return
        if (!entry) {
          notify('That library creature could not be found', 'err')
          return
        }

        const forge = entryToForge(entry)
        const sourceSystem = entrySourceSystem(entry)
        const fields = normalizeSourceFields(entrySourceFields(entry))
        const targetSystem = CONVERTER_SYSTEMS.some((system) => system.value === entry.output_json?.system)
          ? String(entry.output_json?.system)
          : 'shadowdark'
        const source = entry.parsed_json?.source ?? {
          provider: 'library' as const,
          label: 'Library source',
        }

        setM(forge)
        setCm({ ...forge })
        setSrc(sourceSystem)
        setTgt(targetSystem)
        setTgtDone(targetSystem)
        setKnownSourceFields(fields)
        setSourceText(entry.source_text)
        setSourceInfo(source)
        setConvertedSource({
          system: sourceSystem,
          text: entry.source_text,
          source,
          fields: sourceFieldsForStorage(fields),
        })
        setSel(-1)
        setTab('forge')
        setWarningAcknowledged('')
        srcOverridden.current = false
        notify(`“${forge.name}” returned to the forge`)
      })
      .catch((error: unknown) => {
        if (active) {
          notify(error instanceof Error ? error.message : 'Could not open that library creature', 'err')
        }
      })
      .finally(() => {
        if (active) setLoadingCreature(false)
      })

    return () => {
      active = false
    }
  }, [creatureId, notify])

  useEffect(() => {
    if (tab !== 'scribe') return
    if (scribeDebounce.current) clearTimeout(scribeDebounce.current)

    scribeDebounce.current = setTimeout(() => {
      const result = parseStatBlock(scribe)
      setParseWarnings(result.warnings)

      if (result.fieldsFound.length >= 2) {
        setM(result.forge)
        setKnownSourceFields(normalizeSourceFields(result.fieldsFound))
        setSourceText(scribe)
        setSourceInfo({ provider: 'paste', label: 'Pasted stat block' })
        setWarningAcknowledged('')
        setSel(-1)
        if (!srcOverridden.current && result.confidence !== 'none') {
          setSrc(result.system)
        }
        const detected = systemLabelForParse(result.system)
        setParseHint(
          srcOverridden.current
            ? `✓ Read as ${detected} — ${result.fieldsFound.length} fields bound. Source set manually to ${systemLabelForParse(src)}.`
            : `✓ Deciphered as ${detected} — ${result.fieldsFound.length} fields bound into the forge.`,
        )
      } else if (scribe.trim().length >= 12) {
        setParseHint('Could not read much from that block — try the Forge tab to enter fields by hand.')
      } else {
        setParseHint('')
      }
    }, 400)

    return () => {
      if (scribeDebounce.current) clearTimeout(scribeDebounce.current)
    }
  }, [scribe, tab, src])

  const missingSourceFields = useMemo(
    () => missingFromKnown(knownSourceFields),
    [knownSourceFields],
  )
  const conversionWarnings = useMemo(
    () => getConversionWarnings(m, src, tgt, missingSourceFields),
    [m, src, tgt, missingSourceFields],
  )
  const warningSignature = useMemo(
    () => conversionWarnings.map((warning) => `${warning.field}:${warning.message}`).join('|'),
    [conversionWarnings],
  )

  const doConvert = useCallback(
    (targetOverride?: string) => {
      if (rolling) return
      const target = targetOverride ?? tgt
      const warnings = getConversionWarnings(m, src, target, missingSourceFields)
      const signature = warnings.map((warning) => `${warning.field}:${warning.message}`).join('|')

      if (warnings.length > 0 && warningAcknowledged !== signature) {
        setWarningAcknowledged(signature)
        setTab('forge')
        window.requestAnimationFrame(() => {
          const fieldIds: Record<ForgeField, string> = {
            name: 'f-name',
            hd: 'f-hd',
            ac: 'f-ac',
            speed: 'f-sp',
            ml: 'f-ml',
            al: 'f-al',
            kind: 'f-kind',
            stats: 'f-stats',
            saves: 'f-saves',
            statsOverride: 'f-stats-override',
            savesOverride: 'f-saves-override',
            atkText: 'f-atk',
            traitsText: 'f-tr',
          }
          document.getElementById(fieldIds[warnings[0].field])?.focus()
        })
        notify(`Review ${warnings.length} source warning${warnings.length === 1 ? '' : 's'} in the Forge`)
        return
      }

      const snapshot = { ...m }
      const sourceSnapshot: SourceSnapshot = {
        system: src,
        text: sourceText,
        source: sourceInfo,
        fields: sourceFieldsForStorage(knownSourceFields),
      }
      setRolling(true)
      iv.current = setInterval(() => setFace(1 + Math.floor(Math.random() * 20)), 75)
      to.current = setTimeout(() => {
        if (iv.current) clearInterval(iv.current)
        setRolling(false)
        setFace(20)
        setCm(snapshot)
        setConvertedSource(sourceSnapshot)
        setTgtDone(target)
        setFlip((f) => !f)
      }, 850)
    },
    [
      rolling,
      m,
      tgt,
      src,
      missingSourceFields,
      warningAcknowledged,
      sourceText,
      sourceInfo,
      knownSourceFields,
      notify,
    ],
  )

  function onField(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setM((prev) => ({ ...prev, [name]: value }))
    if (FORGE_FIELDS.includes(name as ForgeField)) {
      setKnownSourceFields((current) => new Set(current).add(name as ForgeField))
    }
    setWarningAcknowledged('')
  }

  function pickBeast(i: number) {
    setSel(i)
    setM({ ...BEASTS[i] })
    setKnownSourceFields(new Set(FORGE_FIELDS))
    setSourceText(null)
    setSourceInfo({ provider: 'manual', label: "Warden's specimen" })
    setWarningAcknowledged('')
  }

  const loadTomeIndex = useCallback(async () => {
    setTomeLoading(true)
    setTomeError('')
    try {
      setTomeIndex(await fetchMonsterIndex())
    } catch {
      setTomeError('The tome would not open — monstro.cc could not be reached.')
    } finally {
      setTomeLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'tome' && tomeIndex === null && !tomeLoading) {
      void loadTomeIndex()
    }
  }, [tab, tomeIndex, tomeLoading, loadTomeIndex])

  const tomeResults = useMemo(() => {
    let result = tomeIndex ?? []
    const q = tomeSearch.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (mon) =>
          mon.title.toLowerCase().includes(q) ||
          mon.type?.toLowerCase().includes(q) ||
          mon.biome?.toLowerCase().includes(q),
      )
    }
    if (tomeBook) {
      result = result.filter((mon) => (mon.sourcebooks ?? []).some((s) => s.includes(tomeBook)))
    }
    return { shown: result.slice(0, 50), total: result.length }
  }, [tomeIndex, tomeSearch, tomeBook])

  async function pickMonstro(item: MonstroIndexItem) {
    if (tomeBusySlug) return
    setTomeBusySlug(item.slug)
    setTomeError('')
    try {
      const detail = await fetchMonsterDetail(item.slug)
      const portrayal = pickPortrayal(detail, tomeBook, item.sourcebooks ?? [])
      if (!portrayal) throw new Error('No stat block found')
      const imported = monstroToForgeResult(item, detail, portrayal)
      const sourcebook = portrayalSourcebook(portrayal)
      const sourceSystem = portrayalSourceSystem(portrayal)
      const source: CreatureSource = {
        provider: 'monstro',
        label: `monstro.cc · ${sourcebook.label}`,
        sourcebook: sourcebook.label,
        sourcebookId: sourcebook.id,
        url: `https://monstro.cc/monster/${item.slug}/`,
      }
      const fields = normalizeSourceFields(imported.fieldsFound)
      const forged = imported.forge
      setM(forged)
      setSrc(sourceSystem)
      setKnownSourceFields(fields)
      setSourceText(monstroSourceText(item, detail, portrayal))
      setSourceInfo(source)
      setWarningAcknowledged('')
      srcOverridden.current = false
      setSel(-1)
      setTab('forge')
      notify(`“${forged.name}” drawn from ${sourcebook.label} — review, then transmute`)
    } catch {
      setTomeError('That page of the tome is torn — try another creature.')
    } finally {
      setTomeBusySlug(null)
    }
  }

  function onTgt(v: string) {
    setTgt(v)
    setWarningAcknowledged('')
    doConvert(v)
  }

  const block = format(tgtDone, cm, convertedSource.system)

  function copyText() {
    try {
      navigator.clipboard.writeText(plain(block))
    } catch {
      /* ignore */
    }
    setCopied(true)
    if (ct.current) clearTimeout(ct.current)
    ct.current = setTimeout(() => setCopied(false), 1600)
  }

  function dlJson() {
    const data = {
      app: 'Duskwarden',
      exported: new Date().toISOString(),
      system: tgtDone,
      source: convertedSource,
      monster: { ...cm },
      block,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download =
      'duskwarden-' + (cm.name || 'monster').toLowerCase().replace(/\s+/g, '-') + '-' + tgtDone + '.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  async function saveToLibrary() {
    setSaving(true)
    try {
      const created = await api.createCreature(
        forgeToNewCreature(cm, convertedSource.system, tgtDone, {
          sourceText: convertedSource.text,
          source: convertedSource.source,
          sourceFields: convertedSource.fields,
        }),
      )
      notify(`“${created.title}” saved with converted and source versions`)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not save creature', 'err')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h2 className="pagetitle">The Converter</h2>
          <p className="pagesub">
            Edit a beast in the neutral tongue, then transmute it into any of eight systems.
          </p>
        </div>
        <div className="pagehead-actions">
          <Link className="btn" to="/library">
            ⚲ Browse library
          </Link>
        </div>
      </div>
      <hr className="rule" />

      <div className="main" style={{ marginTop: 8 }}>
        {/* ---- The Offering (input) ---- */}
        <section className="panel">
          <div className="phead">
            <h3 className="ph2">Ⅰ · The Offering</h3>
            <select
              className="sel"
              value={src}
              onChange={(e) => {
                srcOverridden.current = true
                setSrc(e.target.value)
                setWarningAcknowledged('')
              }}
              aria-label="Source system"
            >
              {SOURCE_SYSTEMS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tabs">
            <button className={'tabb' + (tab === 'scribe' ? ' on' : '')} onClick={() => setTab('scribe')}>
              Scribe · paste
            </button>
            <button className={'tabb' + (tab === 'forge' ? ' on' : '')} onClick={() => setTab('forge')}>
              Forge · fields
            </button>
            <button className={'tabb' + (tab === 'tome' ? ' on' : '')} onClick={() => setTab('tome')}>
              Tome · bestiary
            </button>
          </div>

          {tab === 'scribe' && (
            <div className="pbody">
              <ScribeScan
                hasExistingText={scribe.trim().length > 0}
                onAccept={(text) => {
                  srcOverridden.current = false
                  setScribe(text)
                  notify('Stat block inscribed from scan')
                }}
              />
              <textarea
                className="ta"
                value={scribe}
                onChange={(e) => {
                  if (e.target.value.trim().length < 8) srcOverridden.current = false
                  setScribe(e.target.value)
                }}
                aria-label="Paste stat block"
              />
              {parseHint ? (
                <p className="hint parse-hint">{parseHint}</p>
              ) : (
                <p className="hint">
                  Paste a stat block — the warden reads most tongues and binds fields into the{' '}
                  <button className="link-btn" onClick={() => setTab('forge')}>
                    Forge
                  </button>
                  . Garbage in, curses out.
                </p>
              )}
              {parseWarnings.length > 0 && (
                <ul className="parse-warn" role="status">
                  {parseWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'forge' && (
            <div className="pbody">
              {loadingCreature && <p className="hint">Returning the saved creature to the forge…</p>}
              {conversionWarnings.length > 0 && (
                <div className="conversion-warning" role="status">
                  <strong>
                    Review {conversionWarnings.length} source warning
                    {conversionWarnings.length === 1 ? '' : 's'}
                  </strong>
                  <ul>
                    {conversionWarnings.map((warning) => (
                      <li key={`${warning.field}-${warning.message}`}>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            const ids: Partial<Record<ForgeField, string>> = {
                              name: 'f-name',
                              hd: 'f-hd',
                              ac: 'f-ac',
                              speed: 'f-sp',
                              ml: 'f-ml',
                              al: 'f-al',
                              kind: 'f-kind',
                              stats: 'f-stats',
                              saves: 'f-saves',
                              statsOverride: 'f-stats-override',
                              savesOverride: 'f-saves-override',
                              atkText: 'f-atk',
                              traitsText: 'f-tr',
                            }
                            document.getElementById(ids[warning.field] ?? '')?.focus()
                          }}
                        >
                          {warning.label}:
                        </button>{' '}
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="fgrid">
                <div className={'fld' + (conversionWarnings.some((w) => w.field === 'name') ? ' field-warning' : '')}>
                  <label className="flbl" htmlFor="f-name">
                    Name
                  </label>
                  <input className="in" id="f-name" name="name" value={m.name} onChange={onField} />
                </div>
                <div className="fld">
                  <label className="flbl" htmlFor="f-ep">
                    Epithet
                  </label>
                  <input className="in" id="f-ep" name="ep" value={m.ep} onChange={onField} />
                </div>
                <div className="fnum">
                  <div className={'fld' + (conversionWarnings.some((w) => w.field === 'hd') ? ' field-warning' : '')}>
                    <label className="flbl" htmlFor="f-hd">
                      Hit Dice
                    </label>
                    <input
                      className="in"
                      id="f-hd"
                      name="hd"
                      type="number"
                      min={1}
                      max={12}
                      value={m.hd}
                      onChange={onField}
                    />
                  </div>
                  <div className={'fld' + (conversionWarnings.some((w) => w.field === 'ac') ? ' field-warning' : '')}>
                    <label className="flbl" htmlFor="f-ac">
                      AC (asc.)
                    </label>
                    <input
                      className="in"
                      id="f-ac"
                      name="ac"
                      type="number"
                      min={8}
                      max={20}
                      value={m.ac}
                      onChange={onField}
                    />
                  </div>
                  <div className={'fld' + (conversionWarnings.some((w) => w.field === 'speed') ? ' field-warning' : '')}>
                    <label className="flbl" htmlFor="f-sp">
                      Speed (ft)
                    </label>
                    <input
                      className="in"
                      id="f-sp"
                      name="speed"
                      type="number"
                      min={5}
                      max={90}
                      step={5}
                      value={m.speed}
                      onChange={onField}
                    />
                  </div>
                  <div className="fld">
                    <label className="flbl" htmlFor="f-ml">
                      Morale
                    </label>
                    <input
                      className="in"
                      id="f-ml"
                      name="ml"
                      type="number"
                      min={2}
                      max={12}
                      value={m.ml}
                      onChange={onField}
                    />
                  </div>
                </div>
                <div className="fld">
                  <label className="flbl" htmlFor="f-al">
                    Alignment
                  </label>
                  <select className="in" id="f-al" name="al" value={m.al} onChange={onField}>
                    <option value="L">Lawful</option>
                    <option value="N">Neutral</option>
                    <option value="C">Chaotic</option>
                  </select>
                </div>
                <div className="fld">
                  <label className="flbl" htmlFor="f-kind">
                    Kind
                  </label>
                  <input className="in" id="f-kind" name="kind" value={m.kind} onChange={onField} />
                </div>
                <div
                  className={
                    'fld fw' +
                    (conversionWarnings.some((warning) => warning.field === 'stats')
                      ? ' field-warning'
                      : '')
                  }
                >
                  <label className="flbl" htmlFor="f-stats">
                    Source stats / abilities — when present
                  </label>
                  <input
                    className="in"
                    id="f-stats"
                    name="stats"
                    value={m.stats ?? ''}
                    onChange={onField}
                    placeholder="Not present in source"
                  />
                </div>
                <div
                  className={
                    'fld fw' +
                    (conversionWarnings.some((warning) => warning.field === 'saves')
                      ? ' field-warning'
                      : '')
                  }
                >
                  <label className="flbl" htmlFor="f-saves">
                    Source saves — when present
                  </label>
                  <input
                    className="in"
                    id="f-saves"
                    name="saves"
                    value={m.saves ?? ''}
                    onChange={onField}
                    placeholder="Not present in source"
                  />
                </div>
                {(tgt === 'dnd5e' || tgt === 'shadowdark' || m.statsOverride) && (
                  <div
                    className={
                      'fld fw' +
                      (conversionWarnings.some((warning) => warning.field === 'statsOverride')
                        ? ' field-warning'
                        : '')
                    }
                  >
                    <label className="flbl" htmlFor="f-stats-override">
                      {CONVERTER_SYSTEMS.find((system) => system.value === tgt)?.label} stats override
                    </label>
                    <input
                      className="in"
                      id="f-stats-override"
                      name="statsOverride"
                      value={m.statsOverride ?? ''}
                      onChange={onField}
                      placeholder="Optional — leave blank to use translated or derived stats"
                    />
                  </div>
                )}
                {(['ose', 'dcc', 'pf2e'].includes(tgt) || m.savesOverride) && (
                  <div
                    className={
                      'fld fw' +
                      (conversionWarnings.some((warning) => warning.field === 'savesOverride')
                        ? ' field-warning'
                        : '')
                    }
                  >
                    <label className="flbl" htmlFor="f-saves-override">
                      {CONVERTER_SYSTEMS.find((system) => system.value === tgt)?.label} saves override
                    </label>
                    <input
                      className="in"
                      id="f-saves-override"
                      name="savesOverride"
                      value={m.savesOverride ?? ''}
                      onChange={onField}
                      placeholder="Optional — leave blank to use target-system derived saves"
                    />
                  </div>
                )}
                <div
                  className={
                    'fld fw' +
                    (conversionWarnings.some((warning) => warning.field === 'atkText')
                      ? ' field-warning'
                      : '')
                  }
                >
                  <label className="flbl" htmlFor="f-atk">
                    Attacks — “2 Claws 1d4 (paralysis); Bite 1d6”
                  </label>
                  <input className="in" id="f-atk" name="atkText" value={m.atkText} onChange={onField} />
                </div>
                <div className="fld fw">
                  <label className="flbl" htmlFor="f-tr">
                    Special traits — one per line, “Name: effect”
                  </label>
                  <textarea
                    className="ta"
                    id="f-tr"
                    style={{ minHeight: 96 }}
                    name="traitsText"
                    value={m.traitsText}
                    onChange={onField}
                  />
                </div>
              </div>
              <p className="hint">The forge writes in the warden's neutral tongue. Transmute to render it.</p>
            </div>
          )}

          {tab === 'tome' && (
            <div className="pbody">
              <div className="toolbar" style={{ marginBottom: 14 }}>
                <div className="searchbox">
                  <span className="sicon" aria-hidden="true">
                    ⚲
                  </span>
                  <input
                    className="search-in"
                    type="search"
                    placeholder="Search the bestiary…"
                    value={tomeSearch}
                    onChange={(e) => setTomeSearch(e.target.value)}
                    aria-label="Search monsters"
                  />
                </div>
                <select
                  className="filter-sel"
                  value={tomeBook}
                  onChange={(e) => setTomeBook(e.target.value)}
                  aria-label="Filter by sourcebook"
                >
                  {SOURCEBOOK_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {tomeError && (
                <p className="tome-error" role="alert">
                  {tomeError}{' '}
                  <button className="link-btn" onClick={() => void loadTomeIndex()}>
                    Try again
                  </button>
                </p>
              )}

              <div className="tlist tome-list">
                {!tomeSearch.trim() && !tomeBook && (
                  <>
                    <p className="tome-group">Warden's specimens</p>
                    {BEASTS.map((b, i) => (
                      <button
                        key={b.name}
                        className={'trow' + (i === sel ? ' on' : '')}
                        onClick={() => pickBeast(i)}
                      >
                        <span className="tn">{b.name}</span>
                        <span className="te">{b.ep}</span>
                        <span className="th">HD {b.hd}</span>
                      </button>
                    ))}
                    <p className="tome-group">From the great tome · monstro.cc</p>
                  </>
                )}

                {tomeLoading && <p className="hint">Unsealing the tome…</p>}

                {!tomeLoading &&
                  tomeResults.shown.map((mon) => (
                    <button
                      key={mon.slug}
                      className="trow"
                      onClick={() => void pickMonstro(mon)}
                      disabled={tomeBusySlug !== null}
                    >
                      <span className="tn">
                        {tomeBusySlug === mon.slug ? '… ' : ''}
                        {mon.title}
                      </span>
                      <span className="te">
                        {[mon.type, mon.biome].filter(Boolean).join(' · ') || mon.description}
                      </span>
                      <span
                        className="th tome-sources"
                        title={sourcebookSummary(mon.sourcebooks, tomeBook)}
                      >
                        {sourcebookSummary(mon.sourcebooks, tomeBook)}
                      </span>
                    </button>
                  ))}

                {!tomeLoading && tomeIndex !== null && tomeResults.shown.length === 0 && (
                  <p className="hint">No creatures answer that name. Try another search.</p>
                )}
              </div>

              {!tomeLoading && tomeResults.total > 50 && (
                <p className="hint">
                  Showing 50 of {tomeResults.total.toLocaleString()} — narrow your search.
                </p>
              )}
              <p className="hint">
                Bestiary data from{' '}
                <a href="https://monstro.cc" target="_blank" rel="noopener noreferrer">
                  monstro.cc
                </a>{' '}
                — an independent OSR bestiary. Choose a creature to load it into the forge.
              </p>
            </div>
          )}

          <div className="cbar">
            <div className="diebox" aria-hidden="true">
              <D20Die rolling={rolling} />
              <span className="dienum">{face}</span>
            </div>
            <button className="go" onClick={() => doConvert()} disabled={rolling}>
              {conversionWarnings.length > 0 && warningAcknowledged !== warningSignature
                ? `Review ${conversionWarnings.length} warning${conversionWarnings.length === 1 ? '' : 's'}`
                : 'Transmute ⟶'}
            </button>
          </div>
        </section>

        {/* ---- The Transmutation (output) ---- */}
        <section className="panel">
          <div className="phead">
            <h3 className="ph2">Ⅱ · The Transmutation</h3>
            <select
              className="sel"
              value={tgt}
              onChange={(e) => onTgt(e.target.value)}
              aria-label="Target system"
            >
              {CONVERTER_SYSTEMS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sheetwrap">
            <article className={'sheet ' + (flip ? 'rv1' : 'rv2')} key={tgtDone + (flip ? '1' : '0')}>
              <div className="sysb">{block.badge}</div>
              <h3 className="mname">{block.title}</h3>
              {block.ep && <p className="mep">{block.ep}</p>}
              <div className="hrh" />
              <div className="hrt" />
              {block.rows.map((r, i) => (
                <p className="srow" key={i}>
                  <b>{r.k}</b> {r.v}
                </p>
              ))}
              {block.sections.length > 0 && (
                <>
                  <div className="hrt" style={{ marginTop: 12 }} />
                  {block.sections.map((s, i) => (
                    <p className="sect" key={i}>
                      <b className="bi">{s.h}.</b> {s.d}
                    </p>
                  ))}
                </>
              )}
            </article>
          </div>

          <div className="acts">
            <button className="abtn" onClick={copyText}>
              {copied ? '✓ inscribed' : 'Copy stat block'}
            </button>
            <button className="abtn" onClick={dlJson}>
              ↓ Download JSON
            </button>
            <button className="abtn" onClick={saveToLibrary} disabled={saving}>
              {saving ? 'Saving…' : '✦ Save to library'}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
