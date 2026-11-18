'use client';

import { useEffect, useState } from 'react';
import { DeviceCapability } from '@/types/disaster';

export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>({
    isMobile: false,
    isLowEnd: false,
    maxParticles: 5000,
    maxDpr: 1,
    prefersReducedMotion: false,
  });

  useEffect(() => {
    const updateCapability = () => {
      if (typeof window === 'undefined') return;
      
      const isMobile = window.innerWidth < 768;
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      const isLowEnd = isMobile || hardwareConcurrency <= 4;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      setCapability({
        isMobile,
        isLowEnd,
        maxParticles: isLowEnd ? 1500 : 5000,
        maxDpr: isLowEnd ? Math.min(window.devicePixelRatio || 1, 2) : window.devicePixelRatio || 1,
        prefersReducedMotion,
      });
    };

    updateCapability();

    const handleResize = () => updateCapability();
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = () => updateCapability();

    window.addEventListener('resize', handleResize);
    mediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return capability;
}