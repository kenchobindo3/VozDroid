import React from 'react';
import { Sparkles } from 'lucide-react';

interface ZannaAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isListening?: boolean;
  isSpeaking?: boolean;
  isProcessing?: boolean;
  powerSaverActive?: boolean;
}

export const ZannaAvatar: React.FC<ZannaAvatarProps> = ({
  size = 'md',
  isListening = false,
  isSpeaking = false,
  isProcessing = false,
  powerSaverActive = false,
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
  }[size];

  const disableAnim = powerSaverActive || (typeof document !== 'undefined' && document.visibilityState === 'hidden');

  return (
    <div className={`relative flex items-center justify-center rounded-2xl transition-all duration-300 ${sizeClasses}`}>
      {/* Outer pulsing glow rings */}
      {!disableAnim && (
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 opacity-75 blur-md transition-all duration-700 ${
            isListening
              ? 'scale-125 animate-pulse bg-emerald-500'
              : isProcessing
              ? 'scale-110 animate-ping bg-amber-500'
              : isSpeaking
              ? 'scale-120 animate-pulse bg-cyan-400'
              : 'scale-100'
          }`}
        />
      )}

      {/* Core container */}
      <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-950 via-slate-900 to-cyan-950 border border-cyan-500/50 shadow-inner text-cyan-200">
        <Sparkles
          className={`w-1/2 h-1/2 transition-all duration-500 ${
            disableAnim
              ? 'text-cyan-400'
              : isListening
              ? 'text-emerald-300 animate-spin'
              : isProcessing
              ? 'text-amber-300 animate-bounce'
              : isSpeaking
              ? 'text-cyan-300 animate-pulse'
              : 'text-cyan-400'
          }`}
          style={{ animationDuration: '3s' }}
        />
        {/* Core center dot */}
        <span className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ${disableAnim ? 'bg-emerald-400' : 'bg-cyan-400 animate-ping'}`} />
      </div>
    </div>
  );
};
