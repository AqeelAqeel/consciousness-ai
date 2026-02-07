import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { Action } from '../engine/types'

const ACTION_LABELS: Record<Action, string> = {
  observe: 'OBSERVE',
  approach: 'APPROACH',
  flinch: 'FLINCH',
  withdraw: 'WITHDRAW',
  override: 'OVERRIDE',
}

const ACTION_ICONS: Record<Action, string> = {
  observe: '◉',
  approach: '→',
  flinch: '⚡',
  withdraw: '←',
  override: '⟐',
}

const ACTION_COLORS: Record<Action, { active: string; inactive: string }> = {
  observe: { active: '#88aacc', inactive: '#334455' },
  approach: { active: '#44cc88', inactive: '#223322' },
  flinch: { active: '#ff4444', inactive: '#442222' },
  withdraw: { active: '#ff8844', inactive: '#443322' },
  override: { active: '#aa88ff', inactive: '#332244' },
}

export function RadialMenu() {
  const actionAvailability = useStore((s) => s.actionAvailability)
  const currentAction = useStore((s) => s.currentAction)
  const stimulusActive = useStore((s) => s.stimulusActive)

  const items = useMemo(() => {
    const count = actionAvailability.length
    const radius = 72
    return actionAvailability.map((aa, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      return { ...aa, x, y }
    })
  }, [actionAvailability])

  if (!stimulusActive) return null

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
      <div className="relative w-48 h-48">
        {/* Center indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
          <span className="text-xs text-white/40 font-mono tracking-widest">
            {ACTION_ICONS[currentAction]}
          </span>
        </div>

        {/* Action nodes */}
        {items.map((item) => {
          const isActive = item.action === currentAction
          const colors = ACTION_COLORS[item.action]
          const opacity = item.available ? 0.5 + item.strength * 0.5 : 0.15

          return (
            <div
              key={item.action}
              className="absolute pointer-events-auto transition-all duration-500"
              style={{
                left: `calc(50% + ${item.x}px)`,
                top: `calc(50% + ${item.y}px)`,
                transform: 'translate(-50%, -50%)',
                opacity,
              }}
            >
              <div
                className={`
                  flex flex-col items-center gap-1 px-3 py-2 rounded-lg
                  transition-all duration-300
                  ${isActive ? 'scale-110' : 'scale-90'}
                `}
                style={{
                  backgroundColor: isActive ? colors.active + '30' : colors.inactive + '20',
                  borderColor: isActive ? colors.active : 'transparent',
                  borderWidth: 1,
                  boxShadow: isActive ? `0 0 20px ${colors.active}40` : 'none',
                }}
              >
                <span
                  className="text-lg"
                  style={{ color: isActive ? colors.active : colors.inactive }}
                >
                  {ACTION_ICONS[item.action]}
                </span>
                <span
                  className="text-[9px] font-mono tracking-[0.2em] uppercase"
                  style={{ color: isActive ? colors.active : '#556677' }}
                >
                  {ACTION_LABELS[item.action]}
                </span>
                {/* Strength bar */}
                {item.available && (
                  <div className="w-8 h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.strength * 100}%`,
                        backgroundColor: colors.active,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
