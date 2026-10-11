import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAppearance } from '@/store/uiSlice';
import SoftAurora from './SoftAurora';

/** The assistant aurora: a dark glow, or a magenta-to-teal wash in light themes. */
export function ThemedAurora() {
  const dark = useAppSelector(selectAppearance).startsWith('dark');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return (
    <SoftAurora
      speed={reducedMotion ? 0 : 0.6}
      scale={1.5}
      brightness={dark ? 1 : 0.85}
      color1={dark ? '#d7e6ff' : '#e056fd'}
      color2={dark ? '#6ea0ff' : '#2dd4bf'}
      noiseFrequency={2.5}
      noiseAmplitude={1}
      bandHeight={0.55}
      bandSpread={1.15}
      octaveDecay={0.1}
      layerOffset={0.35}
      colorSpeed={reducedMotion ? 0 : 1}
      enableMouseInteraction={false}
      lightMode={!dark}
    />
  );
}
