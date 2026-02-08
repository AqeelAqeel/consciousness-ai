/**
 * Body Computation Engine
 *
 * Maps internal state (ISV), interpretation, action, and somatic signals
 * to a full BodyState describing the mechanical agent's pose.
 *
 * @example
 * // Inside store tick():
 * const bodyState = computeBodyState(state, interp, action, somatic)
 * set({ bodyState })
 *
 * @example
 * // Direct control for testing:
 * import { POSES } from './body'
 * console.log(POSES.flinch) // shows the defensive crouch overrides
 */

import { InternalState, Interpretation, Action, SomaticSignal, BrainRegion } from './types'
import { BodyState, BodyPose, PartState, createDefaultBodyState, BodyPartId } from './bodyTypes'

// ── Action Poses ──

/**
 * Predefined pose presets for each action. Each pose contains partial overrides
 * that are applied on top of the rest pose. These serve as both functional code
 * and documentation of the body control API.
 */
export const POSES: Record<Action, BodyPose> = {
  flinch: {
    name: 'Defensive Crouch',
    overrides: {
      pelvis:    { rotation: [-0.1, 0, 0], offset: [0, -0.06, 0] },
      spine:     { rotation: [-0.15, 0, 0] },
      chest:     { rotation: [-0.12, 0, 0], tension: 0.8 },
      neck:      { rotation: [-0.2, 0, 0] },
      head:      { rotation: [0.15, 0, 0] },  // head stays looking forward
      shoulderL: { rotation: [0, 0, 0.3] },   // shoulders raised
      shoulderR: { rotation: [0, 0, -0.3] },
      upperArmL: { rotation: [0.4, 0, 0.3] }, // arms tucked in
      upperArmR: { rotation: [0.4, 0, -0.3] },
      forearmL:  { rotation: [-0.8, 0, 0] },  // forearms crossed
      forearmR:  { rotation: [-0.8, 0, 0] },
      handL:     { tension: 0.9 },             // clenched
      handR:     { tension: 0.9 },
      thighL:    { rotation: [0.15, 0, 0] },   // knees slightly bent
      thighR:    { rotation: [0.15, 0, 0] },
      shinL:     { rotation: [0.1, 0, 0] },
      shinR:     { rotation: [0.1, 0, 0] },
    },
  },
  withdraw: {
    name: 'Step Back',
    overrides: {
      pelvis:    { rotation: [-0.05, 0.1, 0], offset: [0, 0, 0.08] },
      spine:     { rotation: [-0.1, 0.05, 0] },
      chest:     { rotation: [-0.08, 0, 0], tension: 0.5 },
      neck:      { rotation: [-0.1, -0.1, 0] },
      head:      { rotation: [0.05, -0.15, 0] }, // looking away slightly
      shoulderL: { rotation: [0, 0, 0.15] },
      shoulderR: { rotation: [0, 0, -0.15] },
      upperArmL: { rotation: [0.2, 0, 0.15] },
      upperArmR: { rotation: [0.2, 0, -0.15] },
      forearmL:  { rotation: [-0.3, 0, 0] },
      forearmR:  { rotation: [-0.3, 0, 0] },
      thighL:    { rotation: [-0.1, 0, 0] },   // one leg stepping back
      thighR:    { rotation: [0.08, 0, 0] },
    },
  },
  approach: {
    name: 'Lean Forward / Open',
    overrides: {
      pelvis:    { rotation: [0.05, 0, 0] },
      spine:     { rotation: [0.08, 0, 0] },
      chest:     { rotation: [0.06, 0, 0], tension: 0.3 },
      neck:      { rotation: [0.05, 0, 0] },
      head:      { rotation: [-0.03, 0, 0] },  // slight chin tuck, attentive
      shoulderL: { rotation: [0, 0, -0.1] },   // shoulders relaxed, open
      shoulderR: { rotation: [0, 0, 0.1] },
      upperArmL: { rotation: [-0.15, 0, -0.2] }, // arms slightly open
      upperArmR: { rotation: [-0.15, 0, 0.2] },
      forearmL:  { rotation: [-0.2, 0, 0] },
      forearmR:  { rotation: [-0.2, 0, 0] },
      handL:     { tension: 0.2 },              // relaxed hands
      handR:     { tension: 0.2 },
    },
  },
  observe: {
    name: 'Neutral Alert',
    overrides: {
      chest:     { tension: 0.35 },
      neck:      { rotation: [0.02, 0, 0] },
      head:      { rotation: [-0.02, 0, 0] },  // subtle attention
      shoulderL: { rotation: [0, 0, 0.05] },
      shoulderR: { rotation: [0, 0, -0.05] },
    },
  },
  override: {
    name: 'Controlled / Deliberate',
    overrides: {
      pelvis:    { tension: 0.6 },
      spine:     { rotation: [0.03, 0, 0], tension: 0.7 },
      chest:     { rotation: [0.04, 0, 0], tension: 0.7 },
      neck:      { rotation: [0.02, 0, 0], tension: 0.6 },
      head:      { rotation: [-0.02, 0, 0], tension: 0.6 },
      shoulderL: { tension: 0.5 },
      shoulderR: { tension: 0.5 },
      upperArmL: { rotation: [-0.1, 0, -0.1], tension: 0.5 },
      upperArmR: { rotation: [-0.1, 0, 0.1], tension: 0.5 },
      forearmL:  { rotation: [-0.4, 0, 0], tension: 0.6 },
      forearmR:  { rotation: [-0.4, 0, 0], tension: 0.6 },
      handL:     { tension: 0.4 },
      handR:     { tension: 0.4 },
    },
  },
}

// ── Helpers ──

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v))
}

function lerpVal(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function mergePartState(base: PartState, overrides: Partial<PartState>): PartState {
  return {
    rotation: overrides.rotation ?? [...base.rotation] as [number, number, number],
    offset: overrides.offset ?? [...base.offset] as [number, number, number],
    tension: overrides.tension ?? base.tension,
    tremor: overrides.tremor ?? base.tremor,
    color: overrides.color ?? base.color,
    glow: overrides.glow ?? base.glow,
    glowColor: overrides.glowColor ?? base.glowColor,
  }
}

// ── Main computation ──

// ── Brain region → muscle group mappings ──
// Maps brain region activations to specific body part glow/activation patterns

interface MuscleMapping {
  parts: BodyPartId[]
  glowColor: string
  tensionWeight: number  // how much this region contributes to muscle tension
  glowWeight: number     // how much this region contributes to glow
}

const BRAIN_MUSCLE_MAP: Record<string, MuscleMapping> = {
  // Motor cortex → all voluntary muscles
  'motor-cortex': {
    parts: ['shoulderL', 'shoulderR', 'upperArmL', 'upperArmR', 'forearmL', 'forearmR',
            'handL', 'handR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'],
    glowColor: '#ff8833',
    tensionWeight: 0.3,
    glowWeight: 0.35,
  },
  // Premotor → upper body / arms (planning movements)
  'premotor': {
    parts: ['shoulderL', 'shoulderR', 'upperArmL', 'upperArmR', 'forearmL', 'forearmR', 'chest'],
    glowColor: '#ee7722',
    tensionWeight: 0.2,
    glowWeight: 0.25,
  },
  // SMA → core / trunk (posture & sequencing)
  'sma': {
    parts: ['pelvis', 'spine', 'chest', 'neck'],
    glowColor: '#dd6611',
    tensionWeight: 0.2,
    glowWeight: 0.2,
  },
  // Somatosensory → full body surface awareness
  'somatosensory': {
    parts: ['chest', 'neck', 'head', 'shoulderL', 'shoulderR',
            'forearmL', 'forearmR', 'handL', 'handR', 'shinL', 'shinR'],
    glowColor: '#ffaa44',
    tensionWeight: 0.15,
    glowWeight: 0.3,
  },
  // Amygdala → defensive muscle groups (shoulders, hands clench, neck tense)
  'amygdala': {
    parts: ['neck', 'shoulderL', 'shoulderR', 'handL', 'handR', 'chest'],
    glowColor: '#ff3333',
    tensionWeight: 0.5,
    glowWeight: 0.4,
  },
  // Basal ganglia → legs (gait / locomotion)
  'basal-ganglia': {
    parts: ['hipL', 'hipR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'],
    glowColor: '#cc8844',
    tensionWeight: 0.25,
    glowWeight: 0.25,
  },
  // Cerebellum → extremities (fine coordination)
  'cerebellum': {
    parts: ['handL', 'handR', 'footL', 'footR', 'forearmL', 'forearmR', 'shinL', 'shinR'],
    glowColor: '#aa66dd',
    tensionWeight: 0.15,
    glowWeight: 0.2,
  },
  // Brainstem → core vitals (breathing, posture tone)
  'brainstem': {
    parts: ['spine', 'chest', 'pelvis', 'neck'],
    glowColor: '#ff6677',
    tensionWeight: 0.2,
    glowWeight: 0.15,
  },
  // Hypothalamus → visceral / core (autonomic)
  'hypothalamus': {
    parts: ['chest', 'spine', 'pelvis'],
    glowColor: '#ff44aa',
    tensionWeight: 0.15,
    glowWeight: 0.2,
  },
  // Insula → chest / gut (interoception)
  'insula': {
    parts: ['chest', 'spine', 'pelvis'],
    glowColor: '#cc33ff',
    tensionWeight: 0.1,
    glowWeight: 0.25,
  },
  // Locus coeruleus → global arousal (mild full body activation)
  'locus-coeruleus': {
    parts: ['chest', 'neck', 'head', 'shoulderL', 'shoulderR', 'upperArmL', 'upperArmR',
            'thighL', 'thighR'],
    glowColor: '#ff5566',
    tensionWeight: 0.1,
    glowWeight: 0.15,
  },
  // ACC → neck / head (conflict, cognitive strain → tension)
  'acc': {
    parts: ['neck', 'head', 'headCrown'],
    glowColor: '#ff6688',
    tensionWeight: 0.2,
    glowWeight: 0.3,
  },
  // Prefrontal → head (cognitive processing glow)
  'prefrontal': {
    parts: ['head', 'headCrown'],
    glowColor: '#3388ff',
    tensionWeight: 0.05,
    glowWeight: 0.35,
  },
  // VTA → core (reward / dopamine → warm glow)
  'vta': {
    parts: ['chest', 'spine', 'pelvis'],
    glowColor: '#ffdd44',
    tensionWeight: 0.0,
    glowWeight: 0.25,
  },
  // Broca → jaw / neck (speech motor)
  'broca': {
    parts: ['neck', 'head'],
    glowColor: '#55aaff',
    tensionWeight: 0.1,
    glowWeight: 0.2,
  },
}

/**
 * Compute the full body state from internal state, interpretation, action, somatic signals,
 * and brain region activations.
 *
 * Pipeline:
 * 1. Start from rest pose defaults
 * 2. Apply action-based pose preset
 * 3. Blend ISV influences (threat, energy, familiarity)
 * 4. Overlay somatic signals (chest tension, gut tension, limb warmth/cold)
 * 5. Apply brain region → musculoskeletal activation mapping
 */
export function computeBodyState(
  state: InternalState,
  interp: Interpretation | null,
  action: Action,
  somatic: SomaticSignal[],
  brainRegions?: BrainRegion[],
): BodyState {
  // 1. Start from defaults
  const body = createDefaultBodyState()

  // 2. Apply action pose
  const pose = POSES[action]
  for (const [partId, overrides] of Object.entries(pose.overrides)) {
    const id = partId as keyof typeof body
    if (body[id]) {
      body[id] = mergePartState(body[id], overrides)
    }
  }

  // 3. Blend ISV influences
  const threat = interp?.perceivedThreat ?? state.threat
  const energy = state.energy
  const familiarity = state.familiarity

  // Threat → raise shoulders, increase tension/tremor, red shift
  if (threat > 0.2) {
    const t = (threat - 0.2) / 0.8 // normalize to 0-1
    // Shoulders raise with threat
    body.shoulderL.rotation[2] += t * 0.2
    body.shoulderR.rotation[2] -= t * 0.2
    // Arms tuck in
    body.upperArmL.rotation[2] += t * 0.15
    body.upperArmR.rotation[2] -= t * 0.15
    // Global tension increase
    for (const id of Object.keys(body) as (keyof BodyState)[]) {
      body[id].tension = clamp(body[id].tension + t * 0.3)
      body[id].tremor = clamp(body[id].tremor + t * 0.4)
    }
    // Red shift on key parts
    const redHex = `#${Math.round(0x88 + t * 0x77).toString(16)}6666`
    body.chest.color = redHex
    body.head.color = redHex
  }

  // Low energy → drooped posture
  if (energy < 0.5) {
    const t = (0.5 - energy) / 0.5 // 0 at 0.5 energy, 1 at 0 energy
    body.spine.rotation[0] -= t * 0.15
    body.chest.rotation[0] -= t * 0.1
    body.neck.rotation[0] -= t * 0.1
    body.head.rotation[0] += t * 0.08 // head droops forward
    body.shoulderL.rotation[2] += t * 0.15
    body.shoulderR.rotation[2] -= t * 0.15
    body.upperArmL.rotation[0] += t * 0.2
    body.upperArmR.rotation[0] += t * 0.2
    // Reduce tension (sluggish)
    for (const id of Object.keys(body) as (keyof BodyState)[]) {
      body[id].tension = clamp(body[id].tension - t * 0.2)
    }
  }

  // High familiarity → relaxed joints
  if (familiarity > 0.5) {
    const t = (familiarity - 0.5) / 0.5
    for (const id of Object.keys(body) as (keyof BodyState)[]) {
      body[id].tension = clamp(body[id].tension - t * 0.15)
      body[id].tremor = clamp(body[id].tremor - t * 0.1)
    }
    // Slightly open posture
    body.shoulderL.rotation[2] -= t * 0.05
    body.shoulderR.rotation[2] += t * 0.05
  }

  // 4. Overlay somatic signals
  for (const signal of somatic) {
    const intensity = signal.intensity
    if (signal.region === 'chest') {
      body.chest.glow = clamp(body.chest.glow + intensity * 0.7)
      body.chest.glowColor = signal.type === 'warmth' ? '#ff8844' :
                             signal.type === 'cold'   ? '#4488ff' :
                             signal.type === 'pulse'  ? '#ff4466' : '#ff6644'
    }
    if (signal.region === 'gut') {
      body.pelvis.glow = clamp(body.pelvis.glow + intensity * 0.5)
      body.spine.glow = clamp(body.spine.glow + intensity * 0.3)
      body.pelvis.glowColor = signal.type === 'tension' ? '#ff8800' : '#ffaa44'
    }
    if (signal.region === 'limbs') {
      const limbGlow = intensity * 0.4
      const limbColor = signal.type === 'warmth' ? '#ffaa44' :
                        signal.type === 'cold'   ? '#4466cc' : '#6688aa'
      for (const id of ['upperArmL', 'upperArmR', 'forearmL', 'forearmR',
                         'thighL', 'thighR', 'shinL', 'shinR'] as const) {
        body[id].glow = clamp(body[id].glow + limbGlow)
        body[id].glowColor = limbColor
      }
    }
    if (signal.region === 'head') {
      body.head.glow = clamp(body.head.glow + intensity * 0.5)
      body.headCrown.glow = clamp(body.headCrown.glow + intensity * 0.6)
      body.head.glowColor = signal.type === 'pulse' ? '#aa44ff' : '#6688ff'
      body.headCrown.glowColor = body.head.glowColor
    }
  }

  // Crown antennae always have a baseline glow based on cognitive access
  const cogAccess = interp?.cognitiveAccess ?? energy * 0.8
  body.headCrown.glow = clamp(body.headCrown.glow + cogAccess * 0.4)
  body.headCrown.glowColor = threat > 0.5 ? '#ff4444' :
                              cogAccess > 0.7 ? '#44ddff' : '#6688aa'

  // 5. Apply brain region → musculoskeletal activation
  if (brainRegions && brainRegions.length > 0) {
    applyBrainMuscleMapping(body, brainRegions)
  }

  return body
}

/**
 * Map brain region activations to muscle glow and tension on the body.
 * Higher brain activation → visible muscle activation on the figure,
 * creating a visual chain from brain to body.
 */
function applyBrainMuscleMapping(body: BodyState, regions: BrainRegion[]): void {
  for (const region of regions) {
    const mapping = BRAIN_MUSCLE_MAP[region.id]
    if (!mapping) continue

    const activation = region.activation
    if (activation < 0.15) continue // Skip near-zero activations

    const tensionAdd = activation * mapping.tensionWeight
    const glowAdd = activation * mapping.glowWeight

    for (const partId of mapping.parts) {
      const part = body[partId]
      if (!part) continue

      // Accumulate tension from brain activation
      part.tension = clamp(part.tension + tensionAdd)

      // Accumulate glow — blend colors based on which region is contributing most
      const newGlow = part.glow + glowAdd
      if (glowAdd > part.glow * 0.3) {
        // This region is a major contributor, blend its color in
        part.glowColor = blendHexColors(part.glowColor, mapping.glowColor, glowAdd / (newGlow + 0.01))
      }
      part.glow = clamp(newGlow)

      // High activation → visible tremor on the associated muscles
      if (activation > 0.7 && mapping.tensionWeight > 0.2) {
        part.tremor = clamp(part.tremor + activation * 0.15)
      }
    }
  }
}

/** Blend two hex colors by ratio (0 = all colorA, 1 = all colorB) */
function blendHexColors(a: string, b: string, ratio: number): string {
  const parse = (hex: string) => {
    const c = hex.replace('#', '')
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]
  }
  const ca = parse(a)
  const cb = parse(b)
  const r = Math.round(ca[0] * (1 - ratio) + cb[0] * ratio)
  const g = Math.round(ca[1] * (1 - ratio) + cb[1] * ratio)
  const bl = Math.round(ca[2] * (1 - ratio) + cb[2] * ratio)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}
