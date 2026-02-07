# consciousness-ai

An interactive 3D simulation of artificial consciousness. A humanoid agent processes stimuli through a state-conditioned interpretation pipeline — threat perception, salience filtering, cognitive gating, and motor planning all emerge from the interplay of three internal variables.

Built with React Three Fiber, Zustand, and Tailwind CSS.

## How it works

The agent maintains three internal states that shape how it perceives and reacts to stimuli:

| State           | Controls                                         |
| --------------- | ------------------------------------------------ |
| **Threat**      | Perceived danger, narrows attention, biases motor output toward withdrawal |
| **Familiarity** | Pattern recognition, suppresses threat, reduces salience of repeated stimuli |
| **Energy**      | Cognitive resources, gates executive control and overrides |

When a stimulus is introduced, the engine runs an interpretation step:

```
stimulus × internal state → { perceivedThreat, salience, cognitiveAccess, motorBias }
```

This interpretation drives action selection (`observe`, `approach`, `flinch`, `withdraw`, `override`), somatic signals (chest tension, gut response, limb readiness), brain region activations, and a narration of the agent's cognitive state.

## Visualization

- **3D agent** — posture, color, and jitter respond to threat and action state
- **Brain overlay** — six labeled regions (amygdala, prefrontal cortex, hippocampus, salience network, motor cortex, insula) glow proportionally to activation
- **Somatic map** — colored overlays on the agent's body show chest tension, gut response, and limb readiness
- **Cognitive field** — particle system around the agent reflects internal processing
- **Post-processing** — bloom, vignette, and chromatic aberration intensify with threat
- **Consciousness stream** — real-time log of thoughts, somatic signals, brain activity, and actions

## Running locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Controls

**Left panel** — adjust threat, familiarity, and energy sliders. Introduce preset stimuli (Unknown Object, Sharp Sound, Approaching Figure) or clear the active stimulus. Interpretation readouts and narration update in real time.

**Right panel** — consciousness stream log. Toggleable.

**3D scene** — orbit controls (drag to rotate, scroll to zoom). Drag the stimulus object to change proximity, which feeds back into the threat calculation.

## Tech

- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Drei](https://docs.pmnd.rs/drei) + [Three.js postprocessing](https://docs.pmnd.rs/react-three-postprocessing)
- [Zustand](https://zustand-demo.pmnd.rs/) for state management
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Vite](https://vite.dev/)
- TypeScript

## Project structure

```
src/
├── engine/
│   ├── types.ts        # InternalState, Stimulus, Interpretation, Action, BrainRegion, etc.
│   ├── interpret.ts    # stimulus × state → interpretation
│   ├── actions.ts      # interpretation → action selection + availability
│   └── narrate.ts      # state → narration, cognition fragments, somatic signals, brain regions
├── store/
│   └── useStore.ts     # Zustand store — state, stimulus, derived values, tick loop
├── components/
│   ├── Scene.tsx        # R3F canvas, camera, orbit controls, post-processing
│   ├── Agent.tsx        # 3D humanoid with posture animation and somatic glows
│   ├── BrainOverlay.tsx # Floating brain region indicators
│   ├── BrainRegionLabels.tsx
│   ├── CognitiveField.tsx
│   ├── StimulusObject.tsx
│   ├── DragPlane.tsx
│   ├── Environment.tsx
│   ├── StateControls.tsx    # Left panel — sliders, stimulus buttons, readouts
│   ├── ConsciousnessLog.tsx # Right panel — streaming consciousness log
│   └── RadialMenu.tsx
└── App.tsx             # Layout, tick loop initialization
```

## License

MIT
