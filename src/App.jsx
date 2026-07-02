import { useEffect, useRef, useState } from 'react'
import './App.css'

const TOTAL_LEVELS = 10

const RATINGS = [
  { name: 'HASTY', min: 0 },
  { name: 'VIOLENT', min: 1 },
  { name: 'GRUESOME', min: 2 },
]

// One weapon unlocks per level (hotkeys 1-9, 0 for the 10th). Weapons
// unlocked later carry a brutality bonus so they can push a kill up to
// GRUESOME even without a perfectly stealthy, fast approach — a way to
// offset guards getting harder to sneak past in later levels.
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
]

const LEVEL_WALLS = [
  { x: 0, y: 0, w: 900, h: 20 },
  { x: 0, y: 580, w: 900, h: 20 },
  { x: 0, y: 0, w: 20, h: 600 },
  { x: 880, y: 0, w: 20, h: 600 },
  { x: 250, y: 120, w: 20, h: 220 },
  { x: 500, y: 260, w: 220, h: 20 },
  { x: 620, y: 380, w: 20, h: 180 },
  { x: 120, y: 400, w: 200, h: 20 },
]

// Pool of guard patrol routes spread across the map. Each level uses the
// first N of these, where N grows with the level number.
const ENEMY_TEMPLATES = [
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

// Hardness scales linearly with level: +1 guard per level (capped by the
// template pool), and small compounding bumps to speed/vision/alertness.
function buildLevelConfig(level) {
  const step = level - 1
  return {
    level,
    enemyCount: Math.min(2 + level, ENEMY_TEMPLATES.length),
    speedMult: 1 + step * 0.1,
    visionRangeMult: 1 + step * 0.08,
    visionAngleMult: Math.min(1 + step * 0.05, 1.4),
    alarmMult: 1 + step * 0.15,
  }
}

function makeEnemies(config) {
  return ENEMY_TEMPLATES.slice(0, config.enemyCount).map((t, i) => ({
    id: i + 1,
    x: t.patrol[0].x,
    y: t.patrol[0].y,
    angle: 0,
    speed: t.baseSpeed * config.speedMult,
    patrol: t.patrol,
    patrolIndex: 1,
    alive: true,
  }))
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function circleHitsWalls(x, y, r) {
  const box = { x: x - r, y: y - r, w: r * 2, h: r * 2 }
  return LEVEL_WALLS.some((w) => rectsOverlap(box, w))
}

export default function App() {
  const canvasRef = useRef(null)
  const keysRef = useRef({})
  const stateRef = useRef(null)
  const startLevelRef = useRef(() => {})
  const [hud, setHud] = useState({ kills: 0, total: 3, alarmed: false, prompt: false })
  const [killcam, setKillcam] = useState(null)
  const [phase, setPhase] = useState('playing')
  const [level, setLevel] = useState(1)
  const [summary, setSummary] = useState(null)
  const [equipped, setEquipped] = useState('fists')
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    stateRef.current = {
      level: 1,
      levelConfig: buildLevelConfig(1),
      player: { x: 80, y: 300, angle: 0, crouched: false },
      enemies: [],
      alarmed: false,
      alarmTimer: 0,
      inKillcam: false,
      lastKillTime: performance.now(),
      ratingHistory: [],
      equippedWeaponId: 'fists',
    }

    function startLevel(levelNum) {
      const s = stateRef.current
      const config = buildLevelConfig(levelNum)
      s.level = levelNum
      s.levelConfig = config
      s.player = { x: 80, y: 300, angle: 0, crouched: false }
      s.enemies = makeEnemies(config)
      s.alarmed = false
      s.alarmTimer = 0
      s.inKillcam = false
      s.lastKillTime = performance.now()
      s.equippedWeaponId = WEAPONS[levelNum - 1].id
      setLevel(levelNum)
      setEquipped(s.equippedWeaponId)
      setHud({ kills: 0, total: config.enemyCount, alarmed: false, prompt: false })
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
      const score = Math.min(2, speedBonus + stealthBonus + weapon.bonus)
      const rating = RATINGS.slice().reverse().find((r) => score >= r.min).name
      s.ratingHistory.push(rating)

      setKillcam({ rating, weaponLabel: weapon.killLabel })
      setTimeout(() => {
        setKillcam(null)
        s.inKillcam = false
        setHud((h) => {
          const kills = h.kills + 1
          if (kills >= h.total) {
            const counts = { HASTY: 0, VIOLENT: 0, GRUESOME: 0 }
            s.ratingHistory.forEach((r) => counts[r]++)
            if (s.level >= TOTAL_LEVELS) {
              setSummary({ counts, totalKills: s.ratingHistory.length })
              setPhase('gameComplete')
            } else {
              setSummary({ counts: null, clearedLevel: s.level })
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
        p.crouched = !!keys['shift']
        const moveSpeed = p.crouched ? 60 : 130
        let dx = 0
        let dy = 0
        if (keys['w'] || keys['arrowup']) dy -= 1
        if (keys['s'] || keys['arrowdown']) dy += 1
        if (keys['a'] || keys['arrowleft']) dx -= 1
        if (keys['d'] || keys['arrowright']) dx += 1
        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy)
          dx /= len
          dy /= len
          p.angle = Math.atan2(dy, dx)
          const nx = p.x + dx * moveSpeed * dt
          const ny = p.y + dy * moveSpeed * dt
          if (!circleHitsWalls(nx, p.y, 12)) p.x = nx
          if (!circleHitsWalls(p.x, ny, 12)) p.y = ny
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

          if (dist < visionRange && angleDiff < visionAngle) {
            s.alarmed = true
            s.alarmTimer = 2.5 * config.alarmMult
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
        if (canKill && keys['e']) {
          triggerKillcam(nearestBackstab)
        }

        setHud((h) => ({ ...h, alarmed: s.alarmed, prompt: canKill }))
      }

      ctx.fillStyle = '#0b0b0d'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#222831'
      for (const w of LEVEL_WALLS) ctx.fillRect(w.x, w.y, w.w, w.h)

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
        <span>Level {level} / {TOTAL_LEVELS} · Hardness x{level}</span>
        <span>Kills: {hud.kills} / {hud.total}</span>
        <span className={hud.alarmed ? 'alarm on' : 'alarm'}>
          {hud.alarmed ? 'ALERT' : 'UNDETECTED'}
        </span>
      </div>
      <div className="weapon-bar">
        {WEAPONS.map((w, i) => {
          const unlocked = w.unlockLevel <= level
          return (
            <span
              key={w.id}
              className={
                'weapon-slot' +
                (unlocked ? '' : ' locked') +
                (equipped === w.id ? ' active' : '')
              }
            >
              <span className="key">{i === 9 ? 0 : i + 1}</span>
              {unlocked ? w.name : '???'}
            </span>
          )
        })}
      </div>
      <div className="canvas-wrap">
        <canvas ref={canvasRef} width={900} height={600} />
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
              <button className="cta" onClick={() => startLevelRef.current(level + 1)}>
                Continue to Level {level + 1}
              </button>
            </div>
          </div>
        )}
        {phase === 'gameComplete' && summary && (
          <div className="end-screen">
            <div>
              <h2>ALL 10 LEVELS CLEARED</h2>
              <p>
                Total kills: {summary.totalKills} — Hasty {summary.counts.HASTY} ·
                {' '}Violent {summary.counts.VIOLENT} · Gruesome {summary.counts.GRUESOME}
              </p>
              <button className="cta" onClick={() => startLevelRef.current.newGame()}>
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="hint">
        WASD/Arrows move · Shift crouch · Approach an enemy from behind, undetected · E to execute
        · number keys switch weapon
      </p>
    </div>
  )
}
