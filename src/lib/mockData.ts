/**
 * Seed data for DEMO mode (localStorage). Shaped exactly like real rows from
 * the Duskwarden DB (parsed_json with name/system/level/ac/hp/morale/movement/
 * attacks/specialActions), so the UI exercises the same code paths it will
 * against Supabase.
 */
import type { Entry, Project, ParsedCreature } from './types'

const NOW = '2026-07-01T00:00:00.000Z'

function creature(
  id: string,
  title: string,
  parsed: ParsedCreature,
  projectId: string | null = null,
  tags: string[] = [],
): Entry {
  return {
    id,
    user_id: 'demo-device',
    project_id: projectId,
    type: 'creature',
    title,
    tags,
    source_text: null,
    parsed_json: parsed,
    output_json: null,
    created_at: NOW,
    updated_at: NOW,
  }
}

export const SEED_PROJECTS: Project[] = [
  {
    id: 'proj-barrowmoor',
    user_id: 'demo-device',
    name: 'The Barrowmoor Vault',
    description:
      'A drowned necropolis beneath the fens. Cold kings, colder gold — a six-session delve for a party of four.',
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'proj-ashen',
    user_id: 'demo-device',
    name: 'Ashfall Cathedral',
    description: 'The city burns and the choir keeps singing. A one-shot descent into fanatic ruin.',
    created_at: NOW,
    updated_at: NOW,
  },
]

export const SEED_CREATURES: Entry[] = [
  creature(
    'seed-ghoul',
    'Ghoul',
    {
      name: 'Ghoul',
      system: 'ose',
      level: 2,
      ac: 12,
      hp: 9,
      morale: 9,
      movement: '90′ (30′)',
      alignment: 'Chaotic',
      description: 'grave-fed, ever hungry',
      attacks: [
        { name: '2 Claws', damage: '1d4', note: 'paralysis' },
        { name: 'Bite', damage: '1d6' },
      ],
      specialActions: [
        {
          name: 'Paralytic Touch',
          description: 'A creature clawed must save or be paralyzed 1d4 rounds. Elves are immune.',
        },
        { name: 'Carrion Stench', description: 'First whiff, save or retch — no attacks for 1 round.' },
      ],
    },
    'proj-barrowmoor',
    ['undead', 'classic'],
  ),
  creature(
    'seed-wight',
    'Barrow Wight',
    {
      name: 'Barrow Wight',
      system: 'ose',
      level: 4,
      ac: 14,
      hp: 18,
      morale: 12,
      movement: '90′ (30′)',
      alignment: 'Chaotic',
      description: 'cold hands beneath old kings’ gold',
      attacks: [{ name: 'Chill Touch', damage: '1d6', note: 'drain' }],
      specialActions: [
        {
          name: 'Life Drain',
          description: 'On a hit, save or lose one level of vigor. The slain rise at moonset.',
        },
        { name: 'Old Oaths', description: 'Cannot cross running water or an unbroken line of salt.' },
      ],
    },
    'proj-barrowmoor',
    ['undead', 'boss'],
  ),
  creature(
    'seed-rothound',
    'Rot Hound',
    {
      name: 'Rot Hound',
      system: '5e',
      level: 1,
      ac: 12,
      hp: 5,
      morale: 7,
      movement: '40 ft',
      alignment: 'Neutral',
      description: 'it smelled you three rooms ago',
      attacks: [{ name: 'Bite', damage: '1d6', note: 'grave-rot' }],
      specialActions: [
        { name: 'Grave Rot', description: 'Bitten, save or waste 1 STR each dawn until blessed.' },
        { name: 'Pack Howl', description: 'While two or more howl, morale checks against them are at −2.' },
      ],
    },
    'proj-barrowmoor',
    ['beast'],
  ),
  creature('seed-leech', 'Cave Leech', {
    name: 'Cave Leech',
    system: 'ose',
    level: 3,
    ac: 11,
    hp: 13,
    morale: 8,
    movement: '30′ (10′)',
    alignment: 'Neutral',
    description: 'the ceiling drips, then feeds',
    attacks: [{ name: 'Lash', damage: '1d4', note: 'attach' }],
    specialActions: [
      { name: 'Blood Drain', description: 'Once attached it drains 1d4 HP per round, no roll. Fire makes it let go.' },
      { name: 'Rubbery Hide', description: 'Blunt weapons deal half damage.' },
    ],
  }),
  creature(
    'seed-cultist',
    'Ashen Cultist',
    {
      name: 'Ashen Cultist',
      system: '5e',
      level: 1,
      ac: 13,
      hp: 5,
      morale: 10,
      movement: '30 ft',
      alignment: 'Chaotic',
      description: 'sings while the city burns',
      attacks: [
        { name: 'Sickle', damage: '1d6' },
        { name: 'Ash Flask', damage: '1d4', note: 'blind' },
      ],
      specialActions: [
        { name: 'Fanatic Zeal', description: 'Never checks morale while the Ash-Bishop lives.' },
        { name: 'Ash Veil', description: 'The first missile against them each fight is lost in the choking cloud.' },
      ],
    },
    'proj-ashen',
    ['humanoid', 'cult'],
  ),
  creature(
    'seed-bishop',
    'Ash-Bishop Vurm',
    {
      name: 'Ash-Bishop Vurm',
      system: '5e',
      level: 6,
      ac: 15,
      hp: 45,
      morale: 12,
      movement: '30 ft',
      alignment: 'Chaotic',
      description: 'his sermon is a wildfire',
      attacks: [
        { name: 'Censer', damage: '2d6', note: 'burn' },
        { name: 'Cinder Bolt', damage: '3d6' },
      ],
      specialActions: [
        { name: 'Pyre Sermon', description: 'Once per fight, every cultist within near gains a turn.' },
        { name: 'Ember Ward', description: 'Fire damage heals him instead of harming.' },
      ],
    },
    'proj-ashen',
    ['humanoid', 'boss'],
  ),
  creature('seed-crabspider', 'Crab Spider', {
    name: 'Crab Spider',
    system: 'ose',
    level: 2,
    ac: 12,
    hp: 9,
    morale: 7,
    movement: '120′ (40′)',
    alignment: 'Neutral',
    saves: 'D12 W13 P14 B15 S16 (1)',
    thac0: 18,
    description: '5′ long hunting spiders that change colour to match their surroundings.',
    attacks: [{ name: 'Bite', bonus: 1, damage: '1d8', note: 'poison' }],
    specialActions: [
      { name: 'Ambush', description: 'Attack by dropping on victims from above.' },
      { name: 'Camouflage', description: 'Surprises on a 1–4.' },
      { name: 'Cling', description: 'Can walk on walls and ceilings.' },
    ],
  }),
  creature('seed-skeleton', 'Skeleton Warrior', {
    name: 'Skeleton Warrior',
    system: 'bx',
    level: 1,
    ac: 13,
    hp: 4,
    morale: 12,
    movement: '60′ (20′)',
    alignment: 'Chaotic',
    description: 'rattling bones bound to an old command',
    attacks: [{ name: 'Rusted Blade', damage: '1d6' }],
    specialActions: [{ name: 'Mindless', description: 'Immune to fear and morale, never flees.' }],
  }),
  creature('seed-gremlin', 'Bog Gremlin', {
    name: 'Bog Gremlin',
    system: 'bfrpg',
    level: 1,
    ac: 12,
    hp: 4,
    morale: 6,
    movement: '90′ (30′)',
    alignment: 'Chaotic',
    description: 'small, wet, and full of spite',
    attacks: [{ name: 'Rusty Hook', damage: '1d4' }],
    specialActions: [{ name: 'Sabotage', description: 'Ruins one unattended item of gear each night.' }],
  }),
  creature('seed-owlbear', 'Moor Owlbear', {
    name: 'Moor Owlbear',
    system: '5e',
    level: 5,
    ac: 14,
    hp: 34,
    morale: 10,
    movement: '40 ft',
    alignment: 'Neutral',
    description: 'a fury of feathers and claws',
    attacks: [
      { name: 'Claw', damage: '2d6' },
      { name: 'Beak', damage: '1d10' },
    ],
    specialActions: [{ name: 'Rending Frenzy', description: 'If both claws hit, the target is grappled and raked.' }],
  }),
  creature('seed-wraith', 'Fen Wraith', {
    name: 'Fen Wraith',
    system: 'ose',
    level: 4,
    ac: 15,
    hp: 20,
    morale: 12,
    movement: '120′ (40′) flying',
    alignment: 'Chaotic',
    description: 'a cold draught with intent',
    attacks: [{ name: 'Grave Touch', damage: '1d6', note: 'energy drain' }],
    specialActions: [
      { name: 'Incorporeal', description: 'Only harmed by silver or magic.' },
      { name: 'Sunlight Frailty', description: 'Cannot abide daylight; flees or fades.' },
    ],
  }),
  creature('seed-mudmaw', 'Mudmaw', {
    name: 'Mudmaw',
    system: 'cairn',
    level: 3,
    ac: 11,
    hp: 14,
    morale: 8,
    movement: '20 ft',
    alignment: 'Neutral',
    description: 'the ground opens and swallows',
    attacks: [{ name: 'Engulf', damage: '1d8', note: 'swallow' }],
    specialActions: [{ name: 'Ambush Pit', description: 'Buried until prey steps within near; surprises on 1–3.' }],
  }),
]

export function freshSeedEntries(): Entry[] {
  return SEED_CREATURES.map((c) => ({ ...c, parsed_json: { ...c.parsed_json } as ParsedCreature }))
}
export function freshSeedProjects(): Project[] {
  return SEED_PROJECTS.map((p) => ({ ...p }))
}
