/**
 * Body Control Type System
 *
 * Defines ~20 addressable body segments for a mechanical articulated agent.
 * Each segment can be independently controlled via rotation, offset, tension,
 * tremor, color, and glow parameters.
 *
 * @example
 * // Direct control — set a single part
 * const state: BodyState = { ...DEFAULT_BODY_STATE }
 * state.head.rotation = [0.1, 0, 0]  // look up slightly
 * state.chest.glow = 0.8              // chest glows bright
 *
 * @example
 * // Store-driven — computed each tick from ISV + action + somatic signals
 * import { computeBodyState } from './body'
 * const bodyState = computeBodyState(internalState, interp, action, somatic)
 */

/** All addressable body segments */
export type BodyPartId =
  | 'pelvis'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'headCrown'
  | 'shoulderL'
  | 'shoulderR'
  | 'upperArmL'
  | 'upperArmR'
  | 'forearmL'
  | 'forearmR'
  | 'handL'
  | 'handR'
  | 'hipL'
  | 'hipR'
  | 'thighL'
  | 'thighR'
  | 'shinL'
  | 'shinR'
  | 'footL'
  | 'footR'

/** Physical state for a single body part */
export interface PartState {
  /** Euler rotation in radians [x, y, z]. 0 = neutral/rest. */
  rotation: [number, number, number]
  /** Positional offset from parent joint [x, y, z] in world units. */
  offset: [number, number, number]
  /** Muscle tension 0–1. Higher = stiffer movement, faster lerp. */
  tension: number
  /** Tremor intensity 0–1. Sinusoidal oscillation overlaid on pose. */
  tremor: number
  /** Surface color as hex string. */
  color: string
  /** Emissive glow intensity 0–1. */
  glow: number
  /** Emissive glow color as hex string. */
  glowColor: string
}

/** Full body pose — one PartState per segment */
export type BodyState = Record<BodyPartId, PartState>

/** Named pose preset with partial overrides */
export interface BodyPose {
  name: string
  overrides: Partial<Record<BodyPartId, Partial<PartState>>>
}

/** Neutral defaults for any body part */
export const DEFAULT_PART_STATE: PartState = {
  rotation: [0, 0, 0],
  offset: [0, 0, 0],
  tension: 0.3,
  tremor: 0,
  color: '#8899aa',
  glow: 0,
  glowColor: '#4488ff',
}

/** All part IDs for iteration */
export const ALL_PART_IDS: BodyPartId[] = [
  'pelvis', 'spine', 'chest', 'neck', 'head', 'headCrown',
  'shoulderL', 'shoulderR', 'upperArmL', 'upperArmR',
  'forearmL', 'forearmR', 'handL', 'handR',
  'hipL', 'hipR', 'thighL', 'thighR',
  'shinL', 'shinR', 'footL', 'footR',
]

/** Create a full BodyState with all parts at default */
export function createDefaultBodyState(): BodyState {
  const state = {} as BodyState
  for (const id of ALL_PART_IDS) {
    state[id] = { ...DEFAULT_PART_STATE }
  }
  return state
}
