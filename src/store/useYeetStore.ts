import { create } from 'zustand'

export type ProjectileType = 'baseball' | 'bowling' | 'watermelon' | 'anvil' | 'fish' | 'random'

export interface ProjectileData {
  id: string
  type: Exclude<ProjectileType, 'random'>
  position: [number, number, number]
  velocity: [number, number, number]
  spin: number
  gravity: number
  mass: number
  radius: number
  scale: number
}

const PROJECTILE_CONFIGS: Record<Exclude<ProjectileType, 'random'>, { mass: number; radius: number; scale: number }> = {
  baseball:    { mass: 1,   radius: 0.15, scale: 0.8  },
  bowling:     { mass: 3,   radius: 0.25, scale: 0.55 },
  watermelon:  { mass: 4,   radius: 0.28, scale: 0.55 },
  anvil:       { mass: 8,   radius: 0.3,  scale: 0.5  },
  fish:        { mass: 0.5, radius: 0.18, scale: 0.65 },
}

const TYPES: Exclude<ProjectileType, 'random'>[] = ['baseball', 'bowling', 'watermelon', 'anvil', 'fish']

let idCounter = 0

interface YeetStore {
  // Stats
  hits: number
  thrown: number
  combo: number
  lastHitTime: number
  lastVelocity: number

  // Selected type
  selectedType: ProjectileType
  setSelectedType: (type: ProjectileType) => void

  // Params
  power: number
  angle: number
  gravity: number
  spin: number
  chaosEnabled: boolean
  chaosAmount: number

  setPower: (v: number) => void
  setAngle: (v: number) => void
  setGravity: (v: number) => void
  setSpin: (v: number) => void
  setChaosEnabled: (v: boolean) => void
  setChaosAmount: (v: number) => void

  // Projectiles
  projectiles: ProjectileData[]
  launch: () => void
  removeProjectile: (id: string) => void
  registerHit: () => void

  // Character reaction
  impactDirection: [number, number, number] | null
  lastImpactMass: number | null
  clearImpact: () => void

  // Agent dodge position (written by MechanicalAgent, read by Projectile for collision)
  agentPosition: [number, number, number]
  setAgentPosition: (pos: [number, number, number]) => void

  // Full reset
  resetAll: () => void
}

export const useYeetStore = create<YeetStore>((set, get) => ({
  hits: 0,
  thrown: 0,
  combo: 0,
  lastHitTime: 0,
  lastVelocity: 0,

  selectedType: 'baseball',
  setSelectedType: (type) => set({ selectedType: type }),

  power: 50,
  angle: 35,
  gravity: 9.8,
  spin: 0,
  chaosEnabled: false,
  chaosAmount: 0,

  setPower: (v) => set({ power: v }),
  setAngle: (v) => set({ angle: v }),
  setGravity: (v) => set({ gravity: v }),
  setSpin: (v) => set({ spin: v }),
  setChaosEnabled: (v) => set({ chaosEnabled: v }),
  setChaosAmount: (v) => set({ chaosAmount: v }),

  projectiles: [],

  launch: () => {
    const { power, angle, gravity, spin, chaosEnabled, chaosAmount, selectedType } = get()

    let type = selectedType
    if (type === 'random') {
      type = TYPES[Math.floor(Math.random() * TYPES.length)]
    }
    const config = PROJECTILE_CONFIGS[type]

    let launchAngle = angle * (Math.PI / 180)
    let launchPower = power * 0.08 // scaled for scene
    let spreadX = 0
    let spreadZ = 0

    if (chaosEnabled) {
      const c = chaosAmount / 100
      launchAngle += (Math.random() - 0.5) * c * 0.5
      launchPower += (Math.random() - 0.5) * c * launchPower * 0.3
      spreadX = (Math.random() - 0.5) * c * 0.6
      spreadZ = (Math.random() - 0.5) * c * 0.4
    }

    // Launch from front-left of camera so the arc is clearly visible
    // Camera is at [0, 2.0, 4.5] looking at [0, 1.5, 0]
    const startPos: [number, number, number] = [-2.0 + spreadX, 2.0 + spreadZ * 0.2, 3.0]

    // Direction toward Agent at origin (y=1.5 center, agent scaled 1.5x)
    const targetY = 1.5
    const dx = 0 - startPos[0]
    const dz = 0 - startPos[2]
    const flatDist = Math.sqrt(dx * dx + dz * dz)
    const dirX = dx / flatDist
    const dirZ = dz / flatDist

    // Compute velocity to reach agent despite gravity
    // Using projectile motion: need enough horizontal speed to cover flatDist
    // and enough vertical speed to arc and arrive at targetY
    const tFlight = flatDist / (launchPower * Math.cos(launchAngle) + 0.01) // estimated flight time
    const neededVy = (targetY - startPos[1]) / tFlight + 0.5 * gravity * tFlight // compensate for gravity

    const vx = dirX * launchPower * Math.cos(launchAngle)
    const vy = Math.max(neededVy, launchPower * Math.sin(launchAngle) * 0.5) // ensure upward arc
    const vz = dirZ * launchPower * Math.cos(launchAngle)

    const projectile: ProjectileData = {
      id: `proj-${++idCounter}`,
      type,
      position: startPos,
      velocity: [vx, vy, vz],
      spin,
      gravity,
      mass: config.mass,
      radius: config.radius,
      scale: config.scale,
    }

    set((s) => ({
      projectiles: [...s.projectiles, projectile],
      thrown: s.thrown + 1,
      lastVelocity: Math.round(launchPower * 100) / 10,
    }))
  },

  removeProjectile: (id) => {
    set((s) => ({
      projectiles: s.projectiles.filter((p) => p.id !== id),
    }))
  },

  registerHit: () => {
    const now = Date.now()
    const { lastHitTime, combo } = get()
    const newCombo = now - lastHitTime < 2000 ? combo + 1 : 1
    set({
      hits: get().hits + 1,
      combo: newCombo,
      lastHitTime: now,
    })
  },

  impactDirection: null,
  lastImpactMass: null,
  clearImpact: () => set({ impactDirection: null, lastImpactMass: null }),

  agentPosition: [0, 1.5, 0],
  setAgentPosition: (pos) => set({ agentPosition: pos }),

  resetAll: () => {
    set({
      hits: 0,
      thrown: 0,
      combo: 0,
      lastHitTime: 0,
      lastVelocity: 0,
      selectedType: 'baseball',
      power: 50,
      angle: 35,
      gravity: 9.8,
      spin: 0,
      chaosEnabled: false,
      chaosAmount: 0,
      projectiles: [],
      impactDirection: null,
    })
  },
}))
