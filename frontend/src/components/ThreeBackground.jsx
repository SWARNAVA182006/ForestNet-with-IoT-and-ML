import React from 'react';

export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#040805]">
      {/* Pure, Soothing Animated Forest Artwork Background Loop (Zero Dots / No Orbs) */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-45 transform scale-105 animate-[forestPan_25s_ease-in-out_infinite_alternate]"
        style={{ backgroundImage: "url('/forest_bg.png')" }}
      />

      {/* Soothing Ambient Sunlight Rays & Dark Forest Depth Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#040805]/75 via-transparent to-[#040805]/90 backdrop-blur-[0.5px]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent"></div>

      {/* Keyframe Definition for Smooth Soothing Forest Pan Motion */}
      <style>{`
        @keyframes forestPan {
          0% { transform: scale(1.03) translate(0px, 0px); }
          50% { transform: scale(1.08) translate(-12px, -8px); }
          100% { transform: scale(1.03) translate(8px, 6px); }
        }
      `}</style>
    </div>
  );
}
