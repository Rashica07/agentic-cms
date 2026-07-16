'use client';

import { useCallback, useRef, useState } from 'react';

type Updater<T> = T | ((prev: T) => T);

interface HistoryMeta {
  canUndo: boolean;
  canRedo: boolean;
}

function resolve<T>(updater: Updater<T>, prev: T): T {
  return typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater;
}

/**
 * Bounded undo/redo history over a piece of state (e.g. a page's block
 * array). Mirrors the `useState` shape callers already know:
 *
 *   const { state: blocks, set: setBlocks, undo, redo, canUndo, canRedo } = useHistory<Block[]>(() => [...]);
 *
 * `set()` commits one history entry immediately — use it for discrete
 * mutations (add/remove/reorder/toggle). `setDebounced()` updates the live
 * value right away but only commits a history entry after `delay` ms of
 * inactivity, so a burst of edits (e.g. every keystroke in a text field)
 * collapses into a single undo step. The stack is capped at `maxEntries`;
 * once full, the oldest entry is dropped so it can't grow unbounded over a
 * long editing session.
 *
 * The stack/index live in refs (not state) so `set`/`undo`/`redo` always
 * compute off the true latest value rather than one still mid-flight
 * through React's state batching. `canUndo`/`canRedo` are mirrored into
 * real state (`meta`) — refs are only ever read from event handlers/timeout
 * callbacks here, never during render.
 */
export function useHistory<T>(initial: Updater<T>, maxEntries = 50) {
  const [state, setReactState] = useState<T>(() => resolve(initial, undefined as unknown as T));
  const stateRef = useRef(state);
  const stackRef = useRef<T[]>([state]);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [meta, setMeta] = useState<HistoryMeta>({ canUndo: false, canRedo: false });

  const syncMeta = useCallback(() => {
    setMeta({
      canUndo: indexRef.current > 0,
      canRedo: indexRef.current < stackRef.current.length - 1,
    });
  }, []);

  const applyValue = useCallback((value: T) => {
    stateRef.current = value;
    setReactState(value);
  }, []);

  const pushHistory = useCallback(
    (value: T) => {
      const truncated = stackRef.current.slice(0, indexRef.current + 1);
      truncated.push(value);
      if (truncated.length > maxEntries) truncated.splice(0, truncated.length - maxEntries);
      stackRef.current = truncated;
      indexRef.current = truncated.length - 1;
    },
    [maxEntries],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Commit an update as its own history entry immediately. */
  const set = useCallback(
    (updater: Updater<T>) => {
      const next = resolve(updater, stateRef.current);
      if (next === stateRef.current) return;
      clearTimer();
      applyValue(next);
      pushHistory(next);
      syncMeta();
    },
    [applyValue, pushHistory, clearTimer, syncMeta],
  );

  /**
   * Apply an update immediately (so the UI stays responsive) but delay the
   * history commit until `delay` ms pass without another debounced update —
   * rapid-fire calls (typing) coalesce into one undo step.
   */
  const setDebounced = useCallback(
    (updater: Updater<T>, delay = 500) => {
      const next = resolve(updater, stateRef.current);
      if (next === stateRef.current) return;
      applyValue(next);
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        pushHistory(stateRef.current);
        syncMeta();
      }, delay);
    },
    [applyValue, pushHistory, clearTimer, syncMeta],
  );

  /** Commit any pending debounced edit as a history entry right now. */
  const flush = useCallback(() => {
    if (!timerRef.current) return;
    clearTimer();
    if (stackRef.current[indexRef.current] !== stateRef.current) {
      pushHistory(stateRef.current);
      syncMeta();
    }
  }, [clearTimer, pushHistory, syncMeta]);

  const undo = useCallback(() => {
    flush();
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    applyValue(stackRef.current[indexRef.current]);
    syncMeta();
  }, [flush, applyValue, syncMeta]);

  const redo = useCallback(() => {
    flush();
    if (indexRef.current >= stackRef.current.length - 1) return;
    indexRef.current += 1;
    applyValue(stackRef.current[indexRef.current]);
    syncMeta();
  }, [flush, applyValue, syncMeta]);

  /** Reset the whole history stack to a fresh value (e.g. switching pages). */
  const reset = useCallback(
    (value: T) => {
      clearTimer();
      stackRef.current = [value];
      indexRef.current = 0;
      applyValue(value);
      syncMeta();
    },
    [applyValue, clearTimer, syncMeta],
  );

  return {
    state,
    set,
    setDebounced,
    flush,
    undo,
    redo,
    reset,
    canUndo: meta.canUndo,
    canRedo: meta.canRedo,
  };
}
