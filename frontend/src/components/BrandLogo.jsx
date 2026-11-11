// frontend/src/components/BrandLogo.jsx
import React from 'react';

export default function BrandLogo({ className = "w-9 h-9" }) {
  return (
    <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25 text-white transition-transform duration-200 hover:scale-105 ${className}`}>
      <svg className="w-5 h-5 drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      {/* Subtle specular reflection effect */}
      <div className="absolute inset-x-1.5 top-0.5 h-[1px] bg-white/40 rounded-full" />
    </div>
  );
}
