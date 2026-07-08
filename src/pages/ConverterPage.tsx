import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BEASTS, format, plain, type ForgeMonster } from '../lib/convert'
import { forgeToNewCreature } from '../lib/creatureBridge'
import { CONVERTER_SYSTEMS } from '../lib/systems'
import { api } from '../lib/api'
import { useToast } from '../components/ToastProvider'

type Tab = 'scribe' | 'forge' | 'tome'

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

  const iv = useRef<ReturnType<typeof setInterval> | null>(null)
  const to = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ct = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (iv.current) clearInterval(iv.current)
      if (to.current) clearTimeout(to.current)
      if (ct.current) clearTimeout(ct.current)
    }
  }, [])

  const doConvert = useCallback(
    (targetOverride?: string) => {
      if (rolling) return
      const snapshot = { ...m }
      const target = targetOverride ?? tgt
      setRolling(true)
      iv.current = setInterval(() => setFace(1 + Math.floor(Math.random() * 20)), 75)
      to.current = setTimeout(() => {
        if (iv.current) clearInterval(iv.current)
        setRolling(false)
        setFace(20)
        setCm(snapshot)
        setTgtDone(target)
        setFlip((f) => !f)
      }, 850)
    },
    [rolling, m, tgt],
  )

  function onField(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setM((prev) => ({ ...prev, [name]: value }))
  }

  function pickBeast(i: number) {
    setSel(i)
    setM({ ...BEASTS[i] })
  }

  function onTgt(v: string) {
    setTgt(v)
    doConvert(v)
  }

  const block = format(tgtDone, cm)

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
      const created = await api.createCreature(forgeToNewCreature(cm, src, tgtDone))
      notify(`“${created.title}” saved to your library`)
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
              onChange={(e) => setSrc(e.target.value)}
              aria-label="Source system"
            >
              {CONVERTER_SYSTEMS.map((s) => (
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
              <textarea
                className="ta"
                value={scribe}
                onChange={(e) => setScribe(e.target.value)}
                aria-label="Paste stat block"
              />
              <p className="hint">
                Paste a stat block here for reference. Fine-tune the values in the{' '}
                <button className="link-btn" onClick={() => setTab('forge')}>
                  Forge
                </button>{' '}
                tab, then transmute.
              </p>
            </div>
          )}

          {tab === 'forge' && (
            <div className="pbody">
              <div className="fgrid">
                <div className="fld">
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
                  <div className="fld">
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
                  <div className="fld">
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
                  <div className="fld">
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
                <div className="fld fw">
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
              <div className="tlist">
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
              </div>
              <p className="hint">Five specimens from the warden's own tome. Choose one, then transmute.</p>
            </div>
          )}

          <div className="cbar">
            <div className={'die' + (rolling ? ' roll' : '')}>
              <span className="dienum">{face}</span>
            </div>
            <button className="go" onClick={() => doConvert()} disabled={rolling}>
              Transmute ⟶
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
