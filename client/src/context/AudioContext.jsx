import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { AudioManager } from '../audio/AudioManager';

const AudioCtx = createContext(null);
const AUDIO_MODE_KEY = 'biblionaire_audio_mode';

export function AudioProvider({ children }) {
  const mgr = useRef(null);
  const [audioMode, setAudioModeState] = useState(
    () => localStorage.getItem(AUDIO_MODE_KEY) || 'all'
  );

  function getManager() {
    if (!mgr.current) mgr.current = new AudioManager();
    return mgr.current;
  }

  const initAudio = useCallback(async () => {
    const m = getManager();
    await m.ensureInit();
    m.setAudioMode(audioMode);
  }, [audioMode]);

  const playPreselect    = useCallback(() => getManager().playPreselect(),    []);
  const playClick        = useCallback(() => getManager().playClick(),        []);
  const playCorrect      = useCallback(() => getManager().playCorrect(),      []);
  const playWrong        = useCallback(() => getManager().playWrong(),        []);
  const playSafeHaven    = useCallback(() => getManager().playSafeHaven(),    []);
  const playTierComplete = useCallback(() => getManager().playTierComplete(), []);
  const playVictory      = useCallback(() => getManager().playVictory(),      []);

  const setMusicLevel = useCallback((qi) => getManager().setMusicLevel(qi), []);

  const cycleAudioMode = useCallback(() => {
    const next = getManager().cycleAudioMode();
    setAudioModeState(next);
    localStorage.setItem(AUDIO_MODE_KEY, next);
    return next;
  }, []);

  const stopAll = useCallback((fadeTime) => getManager().stopAll(fadeTime), []);

  return (
    <AudioCtx.Provider value={{
      initAudio, playPreselect, playClick, playCorrect, playWrong,
      playSafeHaven, playTierComplete, playVictory, setMusicLevel,
      cycleAudioMode, audioMode, stopAll,
    }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used inside <AudioProvider>');
  return ctx;
}
