import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import styles from './Popover.module.css';

interface TriggerProps {
  ref: RefObject<HTMLButtonElement>;
  onClick: () => void;
  'aria-expanded': boolean;
  'aria-controls': string;
  'aria-haspopup': 'true';
}

interface PopoverProps {
  trigger: (props: TriggerProps) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  /** Aligns to the trigger's inline start or end edge (mirrors in RTL). */
  align?: 'start' | 'end';
  label: string;
}

/** Popover API menu (top layer, light dismiss), positioned under its trigger. */
export function Popover({ trigger, children, align = 'end', label }: PopoverProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const position = useCallback(() => {
    const anchor = triggerRef.current?.getBoundingClientRect();
    const el = popoverRef.current;
    if (!anchor || !el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const alignRight = (align === 'end') !== rtl;
    const width = el.offsetWidth;
    const left = alignRight ? anchor.right - width : anchor.left;
    el.style.insetInlineStart = 'auto';
    el.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
    el.style.top = `${anchor.bottom + 6}px`;
  }, [align]);

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const onToggle = (event: Event) => {
      const isOpen = (event as ToggleEvent).newState === 'open';
      setOpen(isOpen);
      if (isOpen) position();
    };
    el.addEventListener('toggle', onToggle);
    return () => el.removeEventListener('toggle', onToggle);
  }, [position]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [open, position]);

  const close = useCallback(() => popoverRef.current?.hidePopover(), []);

  return (
    <>
      {trigger({
        ref: triggerRef,
        onClick: () => popoverRef.current?.togglePopover(),
        'aria-expanded': open,
        'aria-controls': id,
        'aria-haspopup': 'true',
      })}
      <div ref={popoverRef} id={id} popover="auto" className={styles.popover} role="dialog" aria-label={label}>
        {typeof children === 'function' ? children(close) : children}
      </div>
    </>
  );
}
