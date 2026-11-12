import { type ComponentRef, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  type KeyboardEvent,
  LayoutAnimation,
  type LayoutChangeEvent,
  Platform,
  type View,
} from 'react-native';

/**
 * Keeps a full-height screen clear of the header above it and the keyboard
 * below it, by measuring where the view really is on screen.
 *
 * - `top`: how much of the view sits under the header (on newer iOS the
 *   screen runs under a see-through header), to pad its top by.
 * - `bottom`: how much of the view the keyboard covers, to pad its bottom
 *   by. It goes back to 0 when the keyboard closes.
 *
 * Measuring, instead of guessing from the header's height, avoids the empty
 * gap above the keyboard and a squashed screen after it closes.
 */
export function useKeyboardRoom(ref: RefObject<ComponentRef<typeof View> | null>, headerHeight = 0) {
  const [bottom, setBottom] = useState(0);
  const [top, setTop] = useState(0);
  const now = useRef(0);

  const onLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      ref.current?.measureInWindow((_x, y) => {
        setTop(Math.max(0, Math.round(headerHeight - y)));
      });
    },
    [ref, headerHeight],
  );

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const animate = (e: KeyboardEvent) => {
      if (!ios) return;
      LayoutAnimation.configureNext({
        duration: e.duration > 10 ? e.duration : 250,
        update: { duration: e.duration > 10 ? e.duration : 250, type: LayoutAnimation.Types.keyboard },
      });
    };
    const set = (next: number, e: KeyboardEvent) => {
      if (next === now.current) return;
      now.current = next;
      animate(e);
      setBottom(next);
    };
    const onChange = (e: KeyboardEvent) => {
      const keyboardTop = e.endCoordinates.screenY;
      ref.current?.measureInWindow((_x, y, _w, height) => set(Math.max(0, Math.round(y + height - keyboardTop)), e));
    };
    const onHide = (e: KeyboardEvent) => set(0, e);
    const subs = ios
      ? [Keyboard.addListener('keyboardWillChangeFrame', onChange), Keyboard.addListener('keyboardWillHide', onHide)]
      : [Keyboard.addListener('keyboardDidShow', onChange), Keyboard.addListener('keyboardDidHide', onHide)];
    return () => subs.forEach((s) => s.remove());
  }, [ref]);

  return { top, bottom, onLayout };
}
