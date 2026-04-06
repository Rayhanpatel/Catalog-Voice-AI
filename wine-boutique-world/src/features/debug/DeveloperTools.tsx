import { Leva } from 'leva'
import { CalibrationMap } from './CalibrationMap'
import { DebugPanel } from './DebugPanel'

interface DeveloperToolsProps {
  experienceReady: boolean
}

export default function DeveloperTools({ experienceReady }: DeveloperToolsProps) {
  return (
    <>
      <DebugPanel />
      {experienceReady && <CalibrationMap />}
      <Leva collapsed={false} oneLineLabels />
    </>
  )
}
