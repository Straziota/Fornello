'use client';
import { useEffect } from 'react';

export default function PageBackground({ src }: { src: string }) {
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.cssText;
    el.style.backgroundImage = `linear-gradient(rgba(247,244,238,0.68), rgba(247,244,238,0.68)), url("${src}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.backgroundAttachment = 'fixed';
    el.style.backgroundRepeat = 'no-repeat';
    return () => { el.style.cssText = prev; };
  }, [src]);

  return null;
}
