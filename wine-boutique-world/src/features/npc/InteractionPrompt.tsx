import { Html } from '@react-three/drei'
import { SOMMELIER_PROMPT } from './interactionShell'

interface InteractionPromptProps {
  position: [number, number, number]
}

export function InteractionPrompt({ position }: InteractionPromptProps) {
  return (
    <Html position={position} center distanceFactor={6}>
      <div className="npc-prompt">
        <strong>{SOMMELIER_PROMPT}</strong>
        <span>Press E</span>
      </div>
    </Html>
  )
}
