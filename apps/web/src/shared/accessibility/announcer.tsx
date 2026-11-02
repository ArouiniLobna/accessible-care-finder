import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * One polite live region for the whole app.
 *
 * Why one: several competing live regions make screen readers interrupt themselves and read
 * stale messages. Every dynamic announcement (search results, availability changes, demo
 * actions) goes through `announce()`.
 *
 * Restraint rules:
 *  - identical messages within 3 s are dropped (no repeats from background refetches);
 *  - the region is cleared before each message so the same sentence can be re-announced later;
 *  - announcing never moves focus.
 */
interface Announcer {
  announce: (message: string) => void;
}

const AnnouncerContext = createContext<Announcer | null>(null);
const MessageContext = createContext('');

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const last = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const timer = useRef<number | undefined>(undefined);

  const announce = useCallback((text: string) => {
    const now = Date.now();
    if (text === last.current.text && now - last.current.at < 3000) return;
    last.current = { text, at: now };
    window.clearTimeout(timer.current);
    setMessage('');
    // A short gap lets assistive technology notice the change even for repeated text.
    timer.current = window.setTimeout(() => setMessage(text), 100);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      <MessageContext.Provider value={message}>{children}</MessageContext.Provider>
    </AnnouncerContext.Provider>
  );
}

/**
 * The live region itself. Rendered once, inside a landmark (the layout's footer), and present
 * from first paint so assistive technology is already watching it when messages arrive.
 */
export function AnnouncerRegion() {
  const message = useContext(MessageContext);
  return (
    <div
      id="app-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="visually-hidden"
    >
      {message}
    </div>
  );
}

export function useAnnouncer(): Announcer {
  const context = useContext(AnnouncerContext);
  if (!context) throw new Error('useAnnouncer must be used inside <AnnouncerProvider>');
  return context;
}
