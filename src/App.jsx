import { useEffect, useRef, useState } from 'react'
import './App.css'

const TOTAL_LEVELS = 20
const PART_ONE_LEVELS = 10
const BESTS_KEY = 'shadowTakedownBests'

function loadBests() {
  try {
    return JSON.parse(localStorage.getItem(BESTS_KEY)) || {}
  } catch {
    return {}
  }
}

function saveBests(bests) {
  localStorage.setItem(BESTS_KEY, JSON.stringify(bests))
}

function formatTime(ms) {
  return (ms / 1000).toFixed(1) + 's'
}

const RATINGS = [
  { name: 'HASTY', min: 0 },
  { name: 'VIOLENT', min: 1 },
  { name: 'GRUESOME', min: 2 },
  { name: 'SAVAGE', min: 3 },
]

// One weapon unlocks per level. Weapons 1-10 (Part One) have hotkeys 1-9
// and 0; weapons 11-20 (Part Two) are click/tap-to-equip only, since there
// aren't enough number keys. Weapons unlocked later carry a bigger
// brutality bonus so they can push a kill rating up without needing a
// perfectly stealthy, fast approach — Part Two's weapons can reach the
// new SAVAGE tier on their own, the way Part One's late weapons could
// reach GRUESOME on their own.
const WEAPONS = [
  { id: 'fists', name: 'Bare Hands', killLabel: 'STRANGLED', unlockLevel: 1, bonus: 0 },
  { id: 'wire', name: 'Wire Garrote', killLabel: 'GARROTED', unlockLevel: 2, bonus: 0 },
  { id: 'shard', name: 'Glass Shard', killLabel: 'SLASHED', unlockLevel: 3, bonus: 0 },
  { id: 'bag', name: 'Plastic Bag', killLabel: 'SUFFOCATED', unlockLevel: 4, bonus: 0 },
  { id: 'crowbar', name: 'Crowbar', killLabel: 'CRUSHED', unlockLevel: 5, bonus: 0 },
  { id: 'knife', name: 'Combat Knife', killLabel: 'STABBED', unlockLevel: 6, bonus: 1 },
  { id: 'rope', name: 'Rope', killLabel: 'HANGED', unlockLevel: 7, bonus: 1 },
  { id: 'hatchet', name: 'Hatchet', killLabel: 'CHOPPED', unlockLevel: 8, bonus: 1 },
  { id: 'hacksaw', name: 'Hacksaw', killLabel: 'SAWED', unlockLevel: 9, bonus: 1 },
  { id: 'chainsaw', name: 'Chainsaw', killLabel: 'SHREDDED', unlockLevel: 10, bonus: 1 },
  { id: 'machete', name: 'Machete', killLabel: 'HACKED', unlockLevel: 11, bonus: 2 },
  { id: 'fireaxe', name: 'Fire Axe', killLabel: 'CLEAVED', unlockLevel: 12, bonus: 2 },
  { id: 'nailgun', name: 'Nail Gun', killLabel: 'IMPALED', unlockLevel: 13, bonus: 2 },
  { id: 'razor', name: 'Straight Razor', killLabel: 'CARVED', unlockLevel: 14, bonus: 2 },
  { id: 'barbwire', name: 'Barbed Wire', killLabel: 'MANGLED', unlockLevel: 15, bonus: 2 },
  { id: 'cleaver', name: 'Meat Cleaver', killLabel: 'BUTCHERED', unlockLevel: 16, bonus: 3 },
  { id: 'sledge', name: 'Sledgehammer', killLabel: 'PULVERIZED', unlockLevel: 17, bonus: 3 },
  { id: 'beartrap', name: 'Bear Trap', killLabel: 'MAULED', unlockLevel: 18, bonus: 3 },
  { id: 'circsaw', name: 'Circular Saw', killLabel: 'DISMEMBERED', unlockLevel: 19, bonus: 3 },
  { id: 'flame', name: 'Flamethrower', killLabel: 'INCINERATED', unlockLevel: 20, bonus: 3 },
]

// Hand-drawn line-art icon for each weapon's card, keyed by weapon id.
const WEAPON_ICONS = {
  fists: (
    <svg viewBox="0 0 100 100">
      <path d="M28 38 Q22 52 32 68 Q45 78 55 70 Q68 75 75 55 Q78 38 65 30 Q48 22 28 38" fill="#f4c38e" stroke="#d4a06a" strokeWidth="6" />
      <circle cx="38" cy="45" r="7" fill="#e8b37d" />
      <circle cx="52" cy="42" r="6.5" fill="#e8b37d" />
      <circle cx="65" cy="48" r="5" fill="#e8b37d" />
    </svg>
  ),
  wire: (
    <svg viewBox="0 0 100 100">
      <circle cx="50" cy="42" r="28" fill="none" stroke="#333" strokeWidth="14" />
      <circle cx="50" cy="42" r="19" fill="none" stroke="#555" strokeWidth="5" />
      <rect x="32" y="68" width="36" height="10" rx="3" fill="#222" />
      <line x1="35" y1="73" x2="65" y2="73" stroke="#777" strokeWidth="3" />
    </svg>
  ),
  shard: (
    <svg viewBox="0 0 100 100">
      <polygon points="32,18 68,72 22,82" fill="#9be3ff" stroke="#1e5a8c" strokeWidth="10" />
      <polygon points="40,35 58,65 35,75" fill="#c5f0ff" opacity="0.7" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 100 100">
      <path d="M28 32 Q28 22 38 18 Q50 12 70 25 Q78 38 72 68 Q65 78 35 78 Q25 65 28 32" fill="#a8e0ff" stroke="#1a3a5c" strokeWidth="8" />
      <rect x="35" y="78" width="32" height="9" fill="#222" />
    </svg>
  ),
  crowbar: (
    <svg viewBox="0 0 100 100">
      <rect x="28" y="18" width="14" height="68" rx="4" fill="#4a4a4a" transform="rotate(-12 32 55)" />
      <path d="M28 22 Q15 12 8 28" fill="none" stroke="#4a4a4a" strokeWidth="22" strokeLinecap="round" />
      <rect x="22" y="18" width="8" height="12" fill="#333" />
    </svg>
  ),
  knife: (
    <svg viewBox="0 0 100 100">
      <polygon points="75,50 22,32 28,50 22,68" fill="#c0c0c0" stroke="#222" strokeWidth="8" />
      <rect x="15" y="45" width="22" height="11" rx="2" fill="#222" />
      <line x1="30" y1="38" x2="65" y2="50" stroke="#ddd" strokeWidth="3" />
    </svg>
  ),
  rope: (
    <svg viewBox="0 0 100 100">
      <path d="M30 28 Q48 12 70 32 Q52 55 35 72 Q52 82 72 58" fill="none" stroke="#8b5a2b" strokeWidth="16" strokeLinecap="round" />
      <path d="M30 28 Q48 12 70 32 Q52 55 35 72 Q52 82 72 58" fill="none" stroke="#d4a06a" strokeWidth="6" strokeLinecap="round" />
    </svg>
  ),
  hatchet: (
    <svg viewBox="0 0 100 100">
      <rect x="48" y="18" width="13" height="62" fill="#8b5a2b" rx="2" />
      <polygon points="28,22 72,22 80,48 20,48" fill="#555" stroke="#333" strokeWidth="6" />
    </svg>
  ),
  hacksaw: (
    <svg viewBox="0 0 100 100">
      <rect x="18" y="55" width="68" height="14" rx="3" fill="#444" />
      <path d="M22 58 L78 58" fill="none" stroke="#ddd" strokeWidth="5" />
      <rect x="22" y="28" width="10" height="32" fill="#333" rx="2" />
    </svg>
  ),
  chainsaw: (
    <svg viewBox="0 0 100 100">
      <rect x="18" y="35" width="58" height="32" rx="4" fill="#333" />
      <rect x="24" y="40" width="48" height="22" fill="#222" />
      <polygon points="28,45 34,39 39,45" fill="#ddd" />
      <polygon points="43,45 49,39 54,45" fill="#ddd" />
      <polygon points="58,45 64,39 69,45" fill="#ddd" />
      <rect x="72" y="34" width="14" height="33" fill="#555" />
      <circle cx="78" cy="50" r="6" fill="#111" />
    </svg>
  ),
  machete: (
    <svg viewBox="0 0 100 100">
      <path d="M20 78 L70 20 L80 28 L34 84 Z" fill="#c9d1d6" stroke="#222" strokeWidth="5" />
      <rect x="8" y="68" width="26" height="13" rx="3" fill="#5a3a20" transform="rotate(-42 21 74)" />
    </svg>
  ),
  fireaxe: (
    <svg viewBox="0 0 100 100">
      <rect x="46" y="15" width="10" height="70" fill="#7a4a20" rx="2" />
      <polygon points="30,20 66,20 78,42 30,50" fill="#d84b2a" stroke="#5a1a10" strokeWidth="5" />
    </svg>
  ),
  nailgun: (
    <svg viewBox="0 0 100 100">
      <rect x="20" y="35" width="45" height="28" rx="6" fill="#e0a020" stroke="#7a5000" strokeWidth="4" />
      <rect x="30" y="63" width="14" height="24" rx="3" fill="#333" />
      <rect x="65" y="44" width="22" height="6" fill="#888" />
      <polygon points="87,42 95,47 87,52" fill="#ccc" />
    </svg>
  ),
  razor: (
    <svg viewBox="0 0 100 100">
      <path d="M25 30 L75 50 L30 62 Z" fill="#d8d8d8" stroke="#222" strokeWidth="4" />
      <rect x="15" y="55" width="30" height="10" rx="4" fill="#3a2a1a" transform="rotate(18 30 60)" />
    </svg>
  ),
  barbwire: (
    <svg viewBox="0 0 100 100">
      <path d="M15 50 Q30 20 45 50 Q60 80 75 50 Q85 30 92 50" fill="none" stroke="#777" strokeWidth="5" />
      <path d="M30 35 l6 -6 M30 35 l-6 -6 M60 65 l6 6 M60 65 l-6 6" stroke="#999" strokeWidth="3" />
    </svg>
  ),
  cleaver: (
    <svg viewBox="0 0 100 100">
      <rect x="30" y="20" width="45" height="35" rx="4" fill="#cfd6da" stroke="#222" strokeWidth="5" />
      <rect x="15" y="55" width="22" height="12" rx="4" fill="#3a2a1a" />
    </svg>
  ),
  sledge: (
    <svg viewBox="0 0 100 100">
      <rect x="46" y="35" width="9" height="55" fill="#7a4a20" rx="2" />
      <rect x="20" y="15" width="55" height="26" rx="5" fill="#555" stroke="#222" strokeWidth="5" />
    </svg>
  ),
  beartrap: (
    <svg viewBox="0 0 100 100">
      <circle cx="50" cy="55" r="30" fill="none" stroke="#444" strokeWidth="8" />
      <path d="M25 40 L35 55 L25 60 M75 40 L65 55 L75 60 M50 25 L45 40 L55 40" fill="none" stroke="#888" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  circsaw: (
    <svg viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="32" fill="none" stroke="#333" strokeWidth="6" strokeDasharray="4 4" />
      <circle cx="50" cy="50" r="24" fill="#999" stroke="#333" strokeWidth="4" />
      <circle cx="50" cy="50" r="8" fill="#333" />
    </svg>
  ),
  flame: (
    <svg viewBox="0 0 100 100">
      <rect x="15" y="55" width="30" height="14" rx="4" fill="#444" />
      <path d="M55 80 Q40 60 55 40 Q60 55 70 50 Q65 65 75 70 Q65 85 55 80" fill="#ff7a1a" stroke="#c0392b" strokeWidth="3" />
    </svg>
  ),
}

const LEVEL_WALLS_PART1 = [
  { x: 0, y: 0, w: 900, h: 20 },
  { x: 0, y: 580, w: 900, h: 20 },
  { x: 0, y: 0, w: 20, h: 600 },
  { x: 880, y: 0, w: 20, h: 600 },
  { x: 250, y: 120, w: 20, h: 220 },
  { x: 500, y: 260, w: 220, h: 20 },
  { x: 620, y: 380, w: 20, h: 180 },
  { x: 120, y: 400, w: 200, h: 20 },
]

// Part Two's map: a symmetric facility with four walled rooms around a
// central divider, with a single choke-point gap in the middle — a
// deliberately different layout from Part One's scattered obstacles.
const LEVEL_WALLS_PART2 = [
  { x: 0, y: 0, w: 900, h: 20 },
  { x: 0, y: 580, w: 900, h: 20 },
  { x: 0, y: 0, w: 20, h: 600 },
  { x: 880, y: 0, w: 20, h: 600 },
  { x: 440, y: 0, w: 20, h: 250 },
  { x: 440, y: 350, w: 20, h: 250 },
  { x: 150, y: 150, w: 180, h: 20 },
  { x: 150, y: 430, w: 180, h: 20 },
  { x: 570, y: 150, w: 180, h: 20 },
  { x: 570, y: 430, w: 180, h: 20 },
  { x: 250, y: 280, w: 20, h: 120 },
  { x: 630, y: 280, w: 20, h: 120 },
]

// Pool of guard patrol routes spread across the map. Each level uses the
// first N of these, where N grows with the level number.
const ENEMY_TEMPLATES_PART1 = [
  { patrol: [{ x: 300, y: 100 }, { x: 300, y: 240 }], baseSpeed: 40 },
  { patrol: [{ x: 650, y: 150 }, { x: 450, y: 150 }], baseSpeed: 35 },
  { patrol: [{ x: 750, y: 480 }, { x: 480, y: 480 }], baseSpeed: 38 },
  { patrol: [{ x: 150, y: 500 }, { x: 150, y: 460 }], baseSpeed: 32 },
  { patrol: [{ x: 820, y: 80 }, { x: 820, y: 320 }], baseSpeed: 36 },
  { patrol: [{ x: 60, y: 60 }, { x: 220, y: 60 }], baseSpeed: 34 },
  { patrol: [{ x: 400, y: 470 }, { x: 400, y: 560 }], baseSpeed: 37 },
  { patrol: [{ x: 760, y: 540 }, { x: 860, y: 540 }], baseSpeed: 33 },
  { patrol: [{ x: 60, y: 250 }, { x: 60, y: 350 }], baseSpeed: 39 },
  { patrol: [{ x: 780, y: 60 }, { x: 780, y: 150 }], baseSpeed: 41 },
]

// Part Two patrols: two guards per room in the four corners, plus two
// guards watching the central choke point.
const ENEMY_TEMPLATES_PART2 = [
  { patrol: [{ x: 90, y: 60 }, { x: 90, y: 130 }], baseSpeed: 38 },
  { patrol: [{ x: 380, y: 60 }, { x: 250, y: 60 }], baseSpeed: 34 },
  { patrol: [{ x: 90, y: 470 }, { x: 90, y: 540 }], baseSpeed: 36 },
  { patrol: [{ x: 380, y: 540 }, { x: 250, y: 540 }], baseSpeed: 40 },
  { patrol: [{ x: 810, y: 60 }, { x: 810, y: 130 }], baseSpeed: 37 },
  { patrol: [{ x: 520, y: 60 }, { x: 650, y: 60 }], baseSpeed: 35 },
  { patrol: [{ x: 810, y: 470 }, { x: 810, y: 540 }], baseSpeed: 39 },
  { patrol: [{ x: 520, y: 540 }, { x: 650, y: 540 }], baseSpeed: 33 },
  { patrol: [{ x: 460, y: 270 }, { x: 460, y: 330 }], baseSpeed: 42 },
  { patrol: [{ x: 350, y: 300 }, { x: 550, y: 300 }], baseSpeed: 41 },
]

function getPart(level) {
  return level <= PART_ONE_LEVELS ? 1 : 2
}

function getWallsForLevel(level) {
  return getPart(level) === 1 ? LEVEL_WALLS_PART1 : LEVEL_WALLS_PART2
}

function getTemplatesForLevel(level) {
  return getPart(level) === 1 ? ENEMY_TEMPLATES_PART1 : ENEMY_TEMPLATES_PART2
}

// Hardness scales linearly with level across both parts: +1 guard per
// level (capped by the template pool), and small compounding bumps to
// speed/vision/alertness that keep climbing into Part Two.
function buildLevelConfig(level) {
  const step = level - 1
  const templates = getTemplatesForLevel(level)
  return {
    level,
    part: getPart(level),
    enemyCount: Math.min(2 + level, templates.length),
    speedMult: 1 + step * 0.1,
    visionRangeMult: 1 + step * 0.08,
    visionAngleMult: Math.min(1 + step * 0.05, 1.4),
    alarmMult: 1 + step * 0.15,
    damage: Math.min(20, 6 + step * 1.2),
    fireInterval: Math.max(0.35, 1.1 - step * 0.07),
  }
}

function makeEnemies(config, templates) {
  return templates.slice(0, config.enemyCount).map((t, i) => ({
    id: i + 1,
    x: t.patrol[0].x,
    y: t.patrol[0].y,
    angle: 0,
    speed: t.baseSpeed * config.speedMult,
    patrol: t.patrol,
    patrolIndex: 1,
    alive: true,
    shootCooldown: 0.5,
  }))
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function circleHitsWalls(x, y, r, walls) {
  const box = { x: x - r, y: y - r, w: r * 2, h: r * 2 }
  return walls.some((w) => rectsOverlap(box, w))
}

function hasLineOfSight(x1, y1, x2, y2, walls) {
  const dist = Math.hypot(x2 - x1, y2 - y1)
  const steps = Math.ceil(dist / 8)
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const x = x1 + (x2 - x1) * t
    const y = y1 + (y2 - y1) * t
    if (walls.some((w) => x > w.x && x < w.x + w.w && y > w.y && y < w.y + w.h)) {
      return false
    }
  }
  return true
}

function WeaponCard({ weapon, keyLabel, unlocked, active, onClick }) {
  return (
    <div
      className={'weapon-card' + (unlocked ? '' : ' locked') + (active ? ' active' : '')}
      onClick={unlocked ? onClick : undefined}
    >
      {keyLabel !== undefined && <div className="weapon-card-num">{keyLabel}</div>}
      <div className="weapon-card-icon">{unlocked ? WEAPON_ICONS[weapon.id] : '?'}</div>
      <div className="weapon-card-label">{unlocked ? weapon.name : '???'}</div>
    </div>
  )
}

function Joystick({ moveRef }) {
  const baseRef = useRef(null)
  const knobRef = useRef(null)
  const activeId = useRef(null)
  const radius = 45

  function updateFromEvent(e) {
    const rect = baseRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy
    const dist = Math.hypot(dx, dy)
    if (dist > radius) {
      dx = (dx / dist) * radius
      dy = (dy / dist) * radius
    }
    moveRef.current = dist < 8 ? { x: 0, y: 0 } : { x: dx / radius, y: dy / radius }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
  }

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    activeId.current = e.pointerId
    updateFromEvent(e)
  }
  function onPointerMove(e) {
    if (activeId.current !== e.pointerId) return
    updateFromEvent(e)
  }
  function onPointerUp(e) {
    if (activeId.current !== e.pointerId) return
    activeId.current = null
    moveRef.current = { x: 0, y: 0 }
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)'
  }

  return (
    <div className="joystick-wrap">
      <div
        className="joystick-base"
        ref={baseRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="joystick-arrow up">▲</span>
        <span className="joystick-arrow down">▼</span>
        <span className="joystick-arrow left">◀</span>
        <span className="joystick-arrow right">▶</span>
        <div className="joystick-knob" ref={knobRef} />
      </div>
      <span className="joystick-label">MOVE</span>
    </div>
  )
}

export default function App() {
  const canvasRef = useRef(null)
  const keysRef = useRef({})
  const touchMoveRef = useRef({ x: 0, y: 0 })
  const touchCrouchRef = useRef(false)
  const touchExecuteRef = useRef(false)
  const stateRef = useRef(null)
  const startLevelRef = useRef(() => {})
  const [hud, setHud] = useState({ kills: 0, total: 3, alarmed: false, prompt: false, health: 100 })
  const [killcam, setKillcam] = useState(null)
  const [phase, setPhase] = useState('playing')
  const [level, setLevel] = useState(1)
  const [summary, setSummary] = useState(null)
  const [equipped, setEquipped] = useState('fists')
  const [hitFlash, setHitFlash] = useState(0)
  const [isTouch, setIsTouch] = useState(false)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  useEffect(() => {
    stateRef.current = {
      level: 1,
      levelConfig: buildLevelConfig(1),
      walls: LEVEL_WALLS_PART1,
      player: { x: 80, y: 300, angle: 0, crouched: false, health: 100 },
      enemies: [],
      alarmed: false,
      alarmTimer: 0,
      inKillcam: false,
      lastKillTime: performance.now(),
      ratingHistory: [],
      levelRatings: [],
      levelStartTime: performance.now(),
      equippedWeaponId: 'fists',
      tracers: [],
      dead: false,
    }

    function startLevel(levelNum) {
      const s = stateRef.current
      const config = buildLevelConfig(levelNum)
      s.level = levelNum
      s.levelConfig = config
      s.walls = getWallsForLevel(levelNum)
      s.player = { x: 80, y: 300, angle: 0, crouched: false, health: 100 }
      s.enemies = makeEnemies(config, getTemplatesForLevel(levelNum))
      s.alarmed = false
      s.alarmTimer = 0
      s.inKillcam = false
      s.lastKillTime = performance.now()
      s.equippedWeaponId = WEAPONS[levelNum - 1].id
      s.tracers = []
      s.dead = false
      s.levelRatings = []
      s.levelStartTime = performance.now()
      setLevel(levelNum)
      setEquipped(s.equippedWeaponId)
      setHud({ kills: 0, total: config.enemyCount, alarmed: false, prompt: false, health: 100 })
      setKillcam(null)
      setSummary(null)
      setPhase('playing')
    }
    startLevelRef.current = startLevel

    function startNewGame() {
      stateRef.current.ratingHistory = []
      startLevel(1)
    }
    startLevelRef.current.newGame = startNewGame

    const onKeyDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true
      const s = stateRef.current
      const slot = e.key === '0' ? 9 : Number(e.key) - 1
      if (Number.isInteger(slot) && slot >= 0 && slot < s.level && WEAPONS[slot]) {
        s.equippedWeaponId = WEAPONS[slot].id
        setEquipped(s.equippedWeaponId)
      }
    }
    const onKeyUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let last = performance.now()

    function triggerKillcam(enemy) {
      const s = stateRef.current
      s.inKillcam = true
      const now = performance.now()
      const timeSinceLast = (now - s.lastKillTime) / 1000
      s.lastKillTime = now
      enemy.alive = false
      const weapon = WEAPONS.find((w) => w.id === s.equippedWeaponId) || WEAPONS[0]
      const stealthy = !s.alarmed
      const speedBonus = timeSinceLast < 4 ? 1 : 0
      const stealthBonus = stealthy ? 1 : 0
      const score = Math.min(3, speedBonus + stealthBonus + weapon.bonus)
      const rating = RATINGS.slice().reverse().find((r) => score >= r.min).name
      s.ratingHistory.push(rating)
      s.levelRatings.push(rating)

      setKillcam({ rating, weaponLabel: weapon.killLabel })
      setTimeout(() => {
        setKillcam(null)
        s.inKillcam = false
        setHud((h) => {
          const kills = h.kills + 1
          if (kills >= h.total) {
            const counts = { HASTY: 0, VIOLENT: 0, GRUESOME: 0, SAVAGE: 0 }
            s.ratingHistory.forEach((r) => counts[r]++)

            const elapsedMs = now - s.levelStartTime
            const bestRatingIdx = Math.max(
              ...s.levelRatings.map((r) => RATINGS.findIndex((x) => x.name === r))
            )
            const runRating = RATINGS[bestRatingIdx].name
            const bests = loadBests()
            const prev = bests[s.level] || {}
            const prevRatingIdx = prev.bestRating
              ? RATINGS.findIndex((r) => r.name === prev.bestRating)
              : -1
            const isNewBestTime = !prev.bestTimeMs || elapsedMs < prev.bestTimeMs
            const isNewBestRating = bestRatingIdx > prevRatingIdx
            bests[s.level] = {
              bestTimeMs: isNewBestTime ? elapsedMs : prev.bestTimeMs,
              bestRating: isNewBestRating ? runRating : prev.bestRating,
            }
            saveBests(bests)
            const personalBest = {
              timeMs: elapsedMs,
              bestTimeMs: bests[s.level].bestTimeMs,
              isNewBestTime,
              rating: runRating,
              bestRating: bests[s.level].bestRating,
              isNewBestRating,
            }

            if (s.level >= TOTAL_LEVELS) {
              setSummary({ counts, totalKills: s.ratingHistory.length, personalBest })
              setPhase('gameComplete')
            } else {
              setSummary({
                counts: null,
                clearedLevel: s.level,
                enteringPart2: s.level === PART_ONE_LEVELS,
                unlockedWeapon: WEAPONS[s.level],
                personalBest,
              })
              setPhase('levelComplete')
            }
          }
          return { ...h, kills }
        })
      }, 1600)
    }

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = stateRef.current
      const keys = keysRef.current
      const config = s.levelConfig

      if (!s.inKillcam && phaseRef.current === 'playing') {
        const p = s.player
        p.crouched = !!keys['shift'] || touchCrouchRef.current
        const moveSpeed = p.crouched ? 60 : 130
        let dx = 0
        let dy = 0
        if (keys['w'] || keys['arrowup']) dy -= 1
        if (keys['s'] || keys['arrowdown']) dy += 1
        if (keys['a'] || keys['arrowleft']) dx -= 1
        if (keys['d'] || keys['arrowright']) dx += 1
        dx += touchMoveRef.current.x
        dy += touchMoveRef.current.y
        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy)
          dx /= len
          dy /= len
          p.angle = Math.atan2(dy, dx)
          const nx = p.x + dx * moveSpeed * dt
          const ny = p.y + dy * moveSpeed * dt
          if (!circleHitsWalls(nx, p.y, 12, s.walls)) p.x = nx
          if (!circleHitsWalls(p.x, ny, 12, s.walls)) p.y = ny
        }

        let nearestBackstab = null
        let nearestDist = Infinity

        for (const en of s.enemies) {
          if (!en.alive) continue
          const target = en.patrol[en.patrolIndex]
          const tdx = target.x - en.x
          const tdy = target.y - en.y
          const tdist = Math.hypot(tdx, tdy)
          if (tdist < 4) {
            en.patrolIndex = (en.patrolIndex + 1) % en.patrol.length
          } else {
            en.angle = Math.atan2(tdy, tdx)
            en.x += (tdx / tdist) * en.speed * dt
            en.y += (tdy / tdist) * en.speed * dt
          }

          const pdx = p.x - en.x
          const pdy = p.y - en.y
          const dist = Math.hypot(pdx, pdy)
          const angleToPlayer = Math.atan2(pdy, pdx)
          let angleDiff = Math.abs(angleToPlayer - en.angle)
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
          const baseRange = p.crouched ? 90 : 180
          const visionRange = baseRange * config.visionRangeMult
          const visionAngle = (Math.PI / 4) * config.visionAngleMult
          const canSee =
            dist < visionRange &&
            angleDiff < visionAngle &&
            hasLineOfSight(en.x, en.y, p.x, p.y, s.walls)

          if (canSee) {
            s.alarmed = true
            s.alarmTimer = 2.5 * config.alarmMult

            en.shootCooldown -= dt
            if (en.shootCooldown <= 0 && p.health > 0) {
              en.shootCooldown = config.fireInterval
              p.health = Math.max(0, p.health - config.damage)
              s.tracers.push({ x1: en.x, y1: en.y, x2: p.x, y2: p.y, time: now })
              setHitFlash(now)
              if (p.health <= 0 && !s.dead) {
                s.dead = true
                s.inKillcam = true
                setPhase('gameOver')
              }
            }
          } else {
            en.shootCooldown = Math.min(en.shootCooldown + dt, 0.5)
          }

          const behindAngle = Math.abs(((angleToPlayer - en.angle + Math.PI * 3) % (2 * Math.PI)) - Math.PI)
          const isBehind = behindAngle < Math.PI / 2.2
          if (dist < 45 && isBehind && dist < nearestDist) {
            nearestDist = dist
            nearestBackstab = en
          }
        }

        if (s.alarmTimer > 0) {
          s.alarmTimer -= dt
          if (s.alarmTimer <= 0) s.alarmed = false
        }

        const canKill = !!nearestBackstab
        if (canKill && (keys['e'] || touchExecuteRef.current)) {
          triggerKillcam(nearestBackstab)
        }
        touchExecuteRef.current = false

        setHud((h) => ({ ...h, alarmed: s.alarmed, prompt: canKill, health: p.health }))
      }

      ctx.fillStyle = '#0b0b0d'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = config.part === 2 ? '#2b1f1f' : '#222831'
      for (const w of s.walls) ctx.fillRect(w.x, w.y, w.w, w.h)

      const visRange = 150 * config.visionRangeMult
      const visSpread = (Math.PI / 4) * config.visionAngleMult

      for (const en of s.enemies) {
        if (!en.alive) continue
        ctx.save()
        ctx.translate(en.x, en.y)
        ctx.rotate(en.angle)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, visRange, -visSpread, visSpread)
        ctx.closePath()
        ctx.fillStyle = s.alarmed ? 'rgba(200,30,30,0.25)' : 'rgba(230,200,60,0.15)'
        ctx.fill()
        ctx.restore()

        ctx.fillStyle = '#c0392b'
        ctx.beginPath()
        ctx.arc(en.x, en.y, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(en.x, en.y)
        ctx.lineTo(en.x + Math.cos(en.angle) * 16, en.y + Math.sin(en.angle) * 16)
        ctx.stroke()
      }

      s.tracers = s.tracers.filter((t) => now - t.time < 150)
      for (const t of s.tracers) {
        const alpha = 1 - (now - t.time) / 150
        ctx.strokeStyle = `rgba(255,120,40,${alpha})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(t.x1, t.y1)
        ctx.lineTo(t.x2, t.y2)
        ctx.stroke()
        ctx.lineWidth = 1
      }

      const p = s.player
      ctx.fillStyle = p.crouched ? '#4f6d7a' : '#e0e0e0'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.crouched ? 8 : 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#000'
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + Math.cos(p.angle) * 14, p.y + Math.sin(p.angle) * 14)
      ctx.stroke()

      raf = requestAnimationFrame(loop)
    }

    startLevel(1)
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="game-root">
      <h1 className="game-title">SHADOW TAKEDOWN</h1>
      <div className="hud">
        <span>Part {getPart(level)} · Level {level} / {TOTAL_LEVELS} · Hardness x{level}</span>
        <span>Kills: {hud.kills} / {hud.total}</span>
        <span className={hud.alarmed ? 'alarm on' : 'alarm'}>
          {hud.alarmed ? 'ALERT' : 'UNDETECTED'}
        </span>
      </div>
      <div className="health-bar">
        <div className="health-fill" style={{ width: `${Math.max(0, hud.health)}%` }} />
        <span className="health-label">{Math.max(0, Math.round(hud.health))} HP</span>
      </div>
      <div className="weapon-bar">
        {(getPart(level) === 1 ? WEAPONS.slice(0, 10) : WEAPONS.slice(10, 20)).map((w) => (
          <WeaponCard
            key={w.id}
            weapon={w}
            keyLabel={getPart(level) === 1 ? (w.unlockLevel === 10 ? 0 : w.unlockLevel) : w.unlockLevel}
            unlocked={w.unlockLevel <= level}
            active={equipped === w.id}
            onClick={() => {
              stateRef.current.equippedWeaponId = w.id
              setEquipped(w.id)
            }}
          />
        ))}
      </div>
      <div className="canvas-wrap">
        <canvas ref={canvasRef} width={900} height={600} />
        {hitFlash > 0 && <div key={hitFlash} className="hit-flash" />}
        {hud.prompt && !killcam && phase === 'playing' && (
          <div className="prompt">Press E to execute — {WEAPONS.find((w) => w.id === equipped)?.name}</div>
        )}
        {killcam && (
          <div className="killcam">
            <div className="bar top" />
            <div className="bar bottom" />
            <div className="flash" />
            <div className="killcam-text">
              {killcam.weaponLabel}
              <span className="killcam-rating">{killcam.rating}</span>
            </div>
          </div>
        )}
        {phase === 'levelComplete' && summary && (
          <div className="end-screen">
            <div>
              <h2>LEVEL {summary.clearedLevel} COMPLETE</h2>
              {summary.personalBest && (
                <p className="best-line">
                  Time: {formatTime(summary.personalBest.timeMs)}
                  {summary.personalBest.isNewBestTime ? (
                    <span className="new-best"> NEW BEST</span>
                  ) : (
                    <> (Best: {formatTime(summary.personalBest.bestTimeMs)})</>
                  )}
                  {' · '}
                  Best kill: {summary.personalBest.rating}
                  {summary.personalBest.isNewBestRating ? (
                    <span className="new-best"> NEW BEST</span>
                  ) : (
                    <> (Best: {summary.personalBest.bestRating})</>
                  )}
                </p>
              )}
              {summary.enteringPart2 && <p className="part-banner">PART TWO BEGINS</p>}
              {summary.unlockedWeapon && (
                <div className="unlock-popup">
                  <p className="unlock-label">NEW WEAPON UNLOCKED</p>
                  <WeaponCard weapon={summary.unlockedWeapon} unlocked active={false} />
                </div>
              )}
              <button className="cta" onClick={() => startLevelRef.current(level + 1)}>
                Continue to Level {level + 1}
              </button>
            </div>
          </div>
        )}
        {phase === 'gameOver' && (
          <div className="end-screen">
            <div>
              <h2>YOU DIED</h2>
              <p>Gunned down on Level {level}</p>
              <button className="cta" onClick={() => startLevelRef.current(level)}>
                Retry Level {level}
              </button>
            </div>
          </div>
        )}
        {phase === 'gameComplete' && summary && (
          <div className="end-screen">
            <div>
              <h2>ALL {TOTAL_LEVELS} LEVELS CLEARED</h2>
              <p>
                Total kills: {summary.totalKills} — Hasty {summary.counts.HASTY} ·
                {' '}Violent {summary.counts.VIOLENT} · Gruesome {summary.counts.GRUESOME} ·
                {' '}Savage {summary.counts.SAVAGE}
              </p>
              {summary.personalBest && (
                <p className="best-line">
                  Level 20 time: {formatTime(summary.personalBest.timeMs)}
                  {summary.personalBest.isNewBestTime && <span className="new-best"> NEW BEST</span>}
                </p>
              )}
              <button className="cta" onClick={() => startLevelRef.current.newGame()}>
                Play Again
              </button>
            </div>
          </div>
        )}
        {isTouch && phase === 'playing' && (
          <div className="touch-controls">
            <Joystick moveRef={touchMoveRef} />
            <div className="touch-buttons">
              <button
                className="touch-btn crouch"
                onPointerDown={() => { touchCrouchRef.current = true }}
                onPointerUp={() => { touchCrouchRef.current = false }}
                onPointerLeave={() => { touchCrouchRef.current = false }}
                onPointerCancel={() => { touchCrouchRef.current = false }}
              >
                CROUCH
              </button>
              <button
                className={'touch-btn execute' + (hud.prompt ? ' ready' : '')}
                onPointerDown={() => { touchExecuteRef.current = true }}
              >
                EAT
              </button>
            </div>
          </div>
        )}
      </div>
      {isTouch ? (
        <p className="hint">
          Left stick to move · CROUCH to sneak · tap a weapon to equip · get behind a guard,
          undetected, and tap EAT · staying in a guard's red cone gets you shot — break line of
          sight behind walls
        </p>
      ) : (
        <p className="hint">
          WASD/Arrows move · Shift crouch · Approach an enemy from behind, undetected · E to execute
          · number keys (1-10) or click a weapon to switch · staying in a guard's red cone gets you
          shot — break line of sight behind walls
        </p>
      )}
    </div>
  )
}
