'use client';

import { useLayoutEffect } from 'react';
import { lenisInstance } from './SmoothScrollProvider';

export function ScrollToTop() {
  useLayoutEffect(() => {
    // A raw window.scrollTo gets overwritten by Lenis's next raf tick (it persists across navigations).
    if (lenisInstance) {
      lenisInstance.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return null;
}
