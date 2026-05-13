import React, { useMemo } from 'react';
import { Orb, AgentState } from './ui/orb';

export type VoiceOrbState = 'idle' | 'listening' | 'talking' | 'thinking';

interface VoiceOrbProps {
  agentState: VoiceOrbState;
  colors?: [string, string];
  volume?: number;
}

export function VoiceOrb({ agentState, colors = ["#CADCFC", "#A0B9D1"], volume = 0 }: VoiceOrbProps) {
  const mappedState: AgentState = agentState === 'idle' ? null : agentState;
  
  return (
    <div className="w-full h-full" style={{ width: '100%', height: '100%' }}>
      <Orb
        agentState={mappedState}
        colors={colors}
        volumeMode="manual"
        manualInput={volume}
        manualOutput={volume}
      />
    </div>
  );
}
