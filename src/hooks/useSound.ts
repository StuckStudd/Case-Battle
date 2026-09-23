import { useMemo } from 'react';
import { useStore } from '../store/inventoryStore';
import { playSound } from '../utils/sound';
import type { SoundName } from '../utils/sound';

export function useSound() {
  const enabled = useStore().state.settings.soundEnabled;
  return useMemo(
    () => ({
      play: (name: SoundName) => {
        if (enabled) playSound(name);
      },
    }),
    [enabled],
  );
}
