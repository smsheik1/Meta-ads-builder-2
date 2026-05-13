import React, { useState } from 'react';
import { VoiceOrb, VoiceOrbState } from './VoiceOrb';

export function VoiceOrbDemo() {
  const [agentState, setAgentState] = useState<VoiceOrbState>('idle');
  const [volume, setVolume] = useState<number>(0);

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-8 w-full bg-gray-50 rounded-xl my-8 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800">ElevenLabs Voice Orb Demo</h2>
      <p className="text-gray-600 text-center max-w-lg">
        Official ElevenLabs Orb Component powered by Three.js
      </p>

      <div className="w-64 h-64 md:w-80 md:h-80 shrink-0 relative bg-black/5 rounded-full overflow-hidden flex items-center justify-center">
        <VoiceOrb agentState={agentState} volume={volume} />
      </div>

      <div className="flex flex-col gap-6 w-full max-w-md bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-700">Agent State</label>
          <div className="flex flex-wrap gap-2">
            {(['idle', 'thinking', 'listening', 'talking'] as VoiceOrbState[]).map((state) => (
              <button
                key={state}
                onClick={() => setAgentState(state)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  agentState === state
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex justify-between text-sm font-semibold text-gray-700">
            <span>Audio Volume (Reactivity)</span>
            <span className="text-gray-500 font-mono text-xs">{volume.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
