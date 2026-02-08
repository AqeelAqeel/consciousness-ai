# SCIS — State-Conditioned Interpretation System

## A Human-Legible Guide to What's Actually Happening

---

## The One-Sentence Version

You throw things at a robot. The robot has feelings about it. Those feelings change how it thinks, moves, and talks to you.

---

## The Three Systems

This project is three intertwined systems that form a closed loop — a Markovian chain where each state depends only on the immediately prior state plus the new input.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   STIMULUS (projectile hit, chat message, scenario)          │
│       │                                                      │
│       ▼                                                      │
│   INTERNAL STATE (threat, familiarity, energy)               │
│       │                                                      │
│       ├──► INTERPRETATION (perceived threat, salience,       │
│       │    cognitive access, motor bias)                      │
│       │       │                                              │
│       │       ├──► ACTION SELECTION (flinch/withdraw/        │
│       │       │    observe/approach/override)                 │
│       │       │                                              │
│       │       ├──► BODY STATE (22 body parts, each with      │
│       │       │    rotation, tension, tremor, color, glow)   │
│       │       │                                              │
│       │       ├──► SOMATIC SIGNALS (chest tension, gut       │
│       │       │    tension, limb warmth/cold, head pulse)    │
│       │       │                                              │
│       │       ├──► BRAIN REGION ACTIVATION (amygdala,        │
│       │       │    prefrontal, hippocampus, salience          │
│       │       │    network, motor cortex, insula)            │
│       │       │                                              │
│       │       ├──► COGNITION FRAGMENTS (word-level:          │
│       │       │    "DANGER", "move", "unknown", "safe        │
│       │       │    enough", etc.)                            │
│       │       │                                              │
│       │       ├──► NARRATION (human-readable explanation)    │
│       │       │                                              │
│       │       └──► THOUGHT STREAM (LLM-generated private    │
│       │            internal monologue)                       │
│       │                                                      │
│       └──► CHAT RESPONSE (LLM-conditioned on current state) │
│               │                                              │
│               └──► REACTIVE THOUGHT (private reflection      │
│                    about what it just said)                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## The Internal State Vector (ISV)

Everything begins here. Three numbers, each 0.0 to 1.0:

| Variable        | What It Represents | Default |
|:----------------|:-------------------|:--------|
| **threat**      | Perceived danger level. High threat shuts down higher cognition, triggers defensive reflexes. | 0.2 |
| **familiarity** | How recognized/known the current situation feels. High familiarity suppresses threat and enables exploration. | 0.1 |
| **energy**      | Cognitive and physical resource pool. Low energy restricts cognitive access and droops posture. | 0.8 |

These three numbers determine *everything* downstream. The system is memoryless in the Markovian sense — given the current ISV, the next outputs are fully determined (deterministic engine) or state-conditioned (LLM responses).

---

## The Chain of Reactions: Step by Step

### Step 0: Resting State

On boot, the agent stands in a neutral pose. ISV = `{threat: 0.2, familiarity: 0.1, energy: 0.8}`. The tick function runs every 500ms. Brain regions glow at baseline. The autonomous thought loop starts generating private thoughts every 8-15 seconds via an LLM.

### Step 1: Something Happens (Stimulus Input)

A stimulus can enter the system through any of three doors:

#### Door A — Projectile Hit (Yeet System)
You press the YEET button (or the Y key). A projectile (baseball, bowling ball, watermelon, anvil, or fish) launches from behind the camera toward the agent. On collision:

```
threat += 0.15 × projectile_mass
```

A baseball (mass 1) bumps threat by ~0.15. An anvil (mass 8) slams it by ~1.0 (capped at 1.0). The heavier the object, the more the agent panics.

#### Door B — Chat Message
You type a message. The system scans for keywords:

- "threat", "danger", "attack", "fear" → `threat += 0.15`
- "safe", "calm", "relax", "peace" → `threat -= 0.15`
- "friend", "know", "remember", "familiar" → `familiarity += 0.1`
- "tired", "exhaust", "sleep", "drain" → `energy -= 0.15`
- "energy", "awake", "alert", "focus" → `energy += 0.1`

Then the LLM generates a response conditioned on the current state context (threat level, cognitive access, motor bias, lowest unmet need).

#### Door C — Scenario Selection
Clicking a preset scenario (Dark Alley, Old Friend, Big Stage, Starving, Flow State) directly sets the ISV and Maslow needs. For example, "Dark Alley" sets `threat: 0.7, energy: 0.6` and drops `safety` need by 0.4.

### Step 2: Interpretation (The Appraisal)

The `interpret()` function transforms raw ISV + stimulus into a perceptual interpretation. This is the Markov transition function.

```
perceivedThreat = stimulus.intensity × (1 + threat) × (1 - familiarity × 0.8)
salience        = stimulus.intensity × (1 - familiarity × 0.5) + threat × 0.3
cognitiveAccess = energy × (1 - threat × 0.7)
motorBias       = perceivedThreat > 0.7 ? "withdraw"
                : cognitiveAccess < 0.3 ? "freeze"
                : "approach"
```

Key insight: **threat and familiarity gate each other**. High threat amplifies perceived danger. High familiarity dampens it. Energy gates cognitive access, but threat can crush cognition even when energy is high. This produces the characteristic "tunnel vision under fear" effect.

### Step 3: Action Selection (The Decision)

A priority cascade, checked top to bottom:

| Condition | Selected Action |
|:----------|:----------------|
| `perceivedThreat > 0.8` | **flinch** — full defensive crouch |
| `perceivedThreat > 0.6` | **withdraw** — step back, look away |
| `cognitiveAccess < 0.2` | **observe** — too depleted to act |
| `motorBias == "freeze"` | **observe** — frozen in assessment |
| `cognitiveAccess > 0.7 && perceivedThreat < 0.3` | **approach** — lean forward, open posture |
| `cognitiveAccess > 0.5` | **override** — controlled deliberate action |
| fallthrough | **observe** — default watchfulness |

This is a simple decision tree, not learned. It's deterministic — same interpretation always yields same action.

### Step 4: The Body Responds

Each action maps to a predefined body pose affecting all 22 body segments (pelvis, spine, chest, neck, head, crown, shoulders, arms, forearms, hands, hips, thighs, shins, feet). Then three modifiers blend on top:

1. **Threat overlay**: Shoulders raise, arms tuck, global tension increases, red color shift on chest and head, tremor increases.
2. **Energy overlay**: Low energy → spine droops, head hangs, shoulders sag, tension decreases (sluggish).
3. **Familiarity overlay**: High familiarity → tension decreases, tremor decreases, posture opens slightly.

The 3D agent smoothly lerps (linear interpolates) toward target positions each frame. Speed scales with tension — a tense body moves faster to its target pose. Tremor adds sinusoidal oscillation. Glow channels light up from somatic signals.

### Step 5: Somatic Signals (The Body Feels)

Generated from interpretation state, these map to visual glows on the mechanical body:

| Signal | Trigger | Visual Effect |
|:-------|:--------|:-------------|
| Chest tension | `perceivedThreat > 0.4` | Orange/red glow on chest |
| Gut tension | Low familiarity + high salience | Orange glow on pelvis/spine |
| Limb warmth | Motor bias = "approach" | Warm glow on arms and legs |
| Limb cold | Motor bias = "withdraw" | Blue glow on arms and legs |
| Head pulse | `salience > 0.6` | Purple pulse on head and crown |

### Step 6: Brain Region Activation

Six simulated brain regions light up proportionally:

| Region | Maps To | Color |
|:-------|:--------|:------|
| Amygdala | perceivedThreat | Red |
| Prefrontal Cortex | cognitiveAccess | Blue |
| Hippocampus | familiarity | Green |
| Salience Network | salience | Yellow |
| Motor Cortex | motor planning intensity | Orange |
| Insula | interoception (fatigue + threat) | Purple |

### Step 7: Cognition Fragments

Single-word or short-phrase thought fragments appear based on state:

- High threat: "DANGER", "move"
- Moderate threat: "uncertain", "assess"
- High familiarity: "recognized"
- Low familiarity: "unknown"
- Low energy: "exhausted"
- Safe + energized: "safe enough"
- Low cognitive access: "overload"

### Step 8: The Thought Stream (LLM Internal Monologue)

Running on a separate timer (8-15 second intervals), the LLM generates private inner speech. The prompt includes:
- Current ISV numbers
- Perceived threat / cognitive access / motor bias
- Active scenario context
- Lowest unmet Maslow need

These thoughts are NOT responses to the user. They're the agent's private experience — raw, fragmented, like real inner speech. They appear in the **Internal Monologue** panel on the right.

When the user sends a chat message, a **reactive thought** is also generated — what the agent privately thinks about the exchange, what it held back.

### Step 9: Chat Response (Conditioned Output)

When you chat, the LLM response is conditioned on the full state context. If no LLM is available, a rule-based fallback produces responses like:

- `threat > 0.7`: "I can't focus on that right now. Something feels wrong."
- `cognitiveAccess < 0.3`: "I'm... having trouble thinking clearly. Too depleted."
- `physiological needs < 0.3`: "It's hard to engage with ideas when my body is screaming for basics."
- `safety needs < 0.4`: "I hear you, but part of me is scanning for threats."
- `familiarity > 0.7`: "Yes, I recognize this pattern."
- Optimal state: "I'm tracking clearly. Full cognitive access."

Each response also generates **association entries** — tagged memory-like records connecting triggers to interpretations with valence (positive/negative/neutral), connected brain regions, and intensity.

---

## The Maslow Layer

Underneath the ISV, five need levels (Maslow's hierarchy) modulate the base state:

```
Self-Actualization ── 0.2 (default)
        Esteem ────── 0.4
     Belonging ────── 0.5
        Safety ────── 0.6
  Physiological ──── 0.8

        ↓ feeds into ↓

threat     = (1 - safety) × 0.5 + (1 - physiological) × 0.3
energy     = physiological × 0.5 + safety × 0.3 + 0.2
familiarity = belonging × 0.3 + esteem × 0.2
```

The lowest unmet need dominates the agent's cognitive framing — if safety is unmet, the agent frames everything through a lens of vigilance.

---

## The Markov Chain, Formally

```
State(t) = ISV(t) = { threat, familiarity, energy }

Input(t) = one of:
  - projectile collision → threat += f(mass)
  - chat keywords → ISV deltas
  - scenario → direct ISV + needs override
  - Maslow slider → needs → ISV blend

Transition:
  ISV(t+1) = clamp(ISV(t) + input_deltas(t))

Output(t) = tick(ISV(t+1), stimulus(t)):
  interpretation = interpret(stimulus, ISV)
  action         = selectAction(interpretation)
  bodyState      = computeBodyState(ISV, interpretation, action, somatic)
  somatic        = generateSomaticSignals(ISV, interpretation)
  brainRegions   = generateBrainRegions(ISV, interpretation)
  fragments      = generateCognitionFragments(ISV, interpretation, stimulus)
  narration      = explain(ISV, stimulus, action)
  chatResponse   = LLM(userMessage, history, stateContext) | fallback(ISV)
  thought        = LLM(stateContext)        [async, 8-15s interval]
  reactiveThought = LLM(exchange, state)    [async, after chat]
```

The system is **memoryless** for the deterministic engine — given the current ISV, all outputs are fully determined. The LLM layer adds stochastic depth through conversation history (last 10 messages) and generated thoughts (kept in a rolling buffer of 50).

---

## The Visual Post-Processing Feedback Loop

The 3D scene's visual rendering is also state-conditioned:

- **Bloom intensity** increases with threat (the world gets brighter, more haloed)
- **Vignette darkness** increases with threat (tunnel vision)
- **Chromatic aberration** increases with threat (visual distortion at edges)

So when you throw an anvil and threat spikes, the entire visual field distorts — the screen darkens at edges, colors aberrate, bloom intensifies. You *see* the agent's perceptual narrowing.

---

## How It Changes Over Time: Observable Behaviors

### Low Threat + High Energy (default-ish)
- Agent stands upright, open posture
- Prefrontal cortex (blue) and hippocampus (green) dominate brain viz
- Thoughts are calm, exploratory
- Chat responses are articulate, engaged
- Limbs glow warm

### After Being Hit by Objects
- Agent flinches or withdraws (shoulders raise, arms cross, knees bend)
- Amygdala (red) lights up, salience network (yellow) spikes
- Chest glows orange-red (tension)
- Limbs go cold (blue glow)
- Head crown pulses faster
- Cognition fragments: "DANGER", "move"
- Chat becomes short, defensive: "I can't focus on that right now"
- Vignette darkens, chromatic aberration increases
- Each subsequent hit compounds threat (heavier = worse)

### After Calming Chat ("everything is calm", "you're safe")
- Threat gradually decreases
- Posture opens back up
- Prefrontal comes back online
- Warm glow returns to limbs
- Thoughts become reflective
- Chat responses become thoughtful

### Starving Scenario (physiological needs crushed)
- Energy drops to 0.25
- Spine droops, head hangs
- Cognitive access severely restricted
- Everything filters through "I need basics"
- Body moves sluggishly (low tension = slow lerp)

### Flow State Scenario
- Threat near zero, energy near max
- Full cognitive access
- Crown antennae glow bright cyan
- Open, leaning-forward posture
- Thoughts become creative/integrative

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Framework | React 19 + TypeScript |
| 3D Rendering | React Three Fiber + Three.js |
| Post-Processing | @react-three/postprocessing |
| State Management | Zustand (two stores: consciousness + yeet) |
| Styling | Tailwind CSS v4 |
| Build | Vite 7 |
| LLM Backend | Any OpenAI-compatible endpoint (configurable via `VITE_LLM_ENDPOINT`) |

---

## File Map

```
src/
├── engine/                    ← The deterministic brain
│   ├── types.ts               ← ISV, Stimulus, Interpretation, Action, etc.
│   ├── interpret.ts           ← The appraisal function (stimulus + ISV → interpretation)
│   ├── actions.ts             ← Action selection (interpretation → action)
│   ├── narrate.ts             ← Cognition fragments, somatic signals, brain regions, narration
│   ├── bodyTypes.ts           ← 22-segment body part type system
│   └── body.ts                ← Pose computation (ISV + action → full body state)
│
├── store/
│   ├── useStore.ts            ← Central consciousness store (ISV, Maslow, chat, thoughts, tick loop)
│   └── useYeetStore.ts        ← Projectile physics store (launch params, collision tracking)
│
├── services/
│   └── llm.ts                 ← LLM inference (chat, think, react-to-chat)
│
├── components/
│   ├── Scene.tsx              ← 3D canvas: agent, terrain, projectiles, post-effects
│   ├── MechanicalAgent.tsx    ← 22-joint articulated robot body (lerps to bodyState each frame)
│   ├── ChatPanel.tsx          ← Chat UI + scenario buttons + state micro-display
│   ├── ThoughtPanel.tsx       ← Private internal monologue stream
│   ├── BrainPanel.tsx         ← Brain region activation visualization
│   ├── StatePanel.tsx         ← ISV sliders, Maslow pyramid, somatic signals, associations
│   ├── InterpretationPanel.tsx← Interpretation readout
│   ├── MaslowPyramid.tsx      ← Interactive needs hierarchy
│   ├── Terrain.tsx            ← 3D ground plane
│   ├── yeet/
│   │   ├── YeetPanel.tsx      ← Projectile launcher UI (type, power, angle, chaos)
│   │   ├── Projectile.tsx     ← Physics simulation + collision detection + threat spike
│   │   └── Debris.tsx         ← Hit particle effects
│   └── ...                    ← Supporting 3D components
│
└── App.tsx                    ← Layout: chat (left), scene+brain (center-right), yeet+state+thoughts (bottom)
```

---

## Running It

```bash
npm install
npm run dev
```

For LLM-powered thoughts and chat, set:
```
VITE_LLM_ENDPOINT=http://localhost:8000/v1/chat/completions
VITE_LLM_MODEL=your-model-name
```

Without an LLM endpoint, chat falls back to rule-based responses. The thought stream will be silent.

---

## The Core Insight

This isn't a chatbot with a 3D avatar. It's a **state machine with embodied cognition**. The agent doesn't just *say* it's scared — its body contracts, its vision narrows, its cognitive access drops, its brain regions shift from blue (prefrontal) to red (amygdala), and its chat responses degrade from articulate to fragmented. Throw enough anvils and the agent can barely speak.

The projectile system isn't a game bolted onto an AI — it's the primary stimulus channel. Physical interaction (throwing things) produces the same state transitions as verbal interaction (saying "I'm afraid"), because both feed into the same three numbers. The system doesn't distinguish between "being told about danger" and "experiencing danger." That's the point.
