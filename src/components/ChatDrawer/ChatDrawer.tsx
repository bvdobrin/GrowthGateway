import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Bot, RotateCcw, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { gleanClient } from '@/services/glean';
import { askAssistant, clearChat, closeChat, selectChat } from '@/store/chatSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { MarkdownView } from '../MarkdownView/MarkdownView';
import styles from './ChatDrawer.module.css';

/**
 * Assistant panel on a native <dialog>: modal and full screen below the `bp.lg`
 * token, a non-modal docked panel from there up.
 */
export function ChatDrawer() {
  const { t } = useTranslation('chat');
  const dispatch = useAppDispatch();
  const { open, messages, pending } = useAppSelector(selectChat);
  const isDesktop = useIsDesktop();
  const { byId } = useTaxonomy();
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');
  const titleId = useId();
  const inputId = useId();
  const suggestions = t('suggestions', { returnObjects: true }) as string[];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (dialog.open) dialog.close();
      if (isDesktop) dialog.show();
      else dialog.showModal();
      inputRef.current?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, isDesktop]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, pending]);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    setDraft('');
    void dispatch(askAssistant(question));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(draft);
    }
  };

  return (
    <dialog
      ref={ref}
      className={styles.drawer}
      aria-labelledby={titleId}
      onClose={() => {
        // Switching between modal and docked mode closes and reopens the dialog.
        if (open && !ref.current?.open) dispatch(closeChat());
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          dispatch(closeChat());
        }
      }}
    >
      <header className={styles.header}>
        <span className={styles.badge} aria-hidden="true">
          <Bot />
        </span>
        <div className={styles.heading}>
          <h2 id={titleId} className={styles.title}>
            {t('title')}
          </h2>
          <p className={styles.subtitle}>
            {t(`mode.${gleanClient.mode}`)} · {t('subtitle')}
          </p>
        </div>
        <Button variant="ghost" size="sm" iconOnly icon={<RotateCcw />} onClick={() => dispatch(clearChat())} disabled={!messages.length}>
          {t('clear')}
        </Button>
        <Button variant="ghost" size="sm" iconOnly icon={<X />} onClick={() => dispatch(closeChat())}>
          {t('common:actions.close')}
        </Button>
      </header>

      <div className={styles.log} role="log" aria-live="polite" aria-busy={pending}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <p>{t('empty')}</p>
            <ul role="list" className={styles.suggestions}>
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" className={styles.suggestion} onClick={() => send(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {messages.map((message) => (
          <article key={message.id} className={`${styles.message} ${styles[message.role]} ${message.error ? styles.error : ''}`}>
            <h3 className="u-visually-hidden">{message.role === 'user' ? t('you') : t('assistant')}</h3>
            {message.role === 'assistant' ? <MarkdownView source={message.content} compact /> : <p dir="auto">{message.content}</p>}
            {message.citations && message.citations.length > 0 && (
              <div className={styles.citations}>
                <p className={styles.citationsTitle}>{t('sources')}</p>
                <ul role="list">
                  {message.citations.map((ref) => (
                    <li key={ref.id}>
                      <Link
                        to={`/assets/${ref.id}`}
                        className={styles.citation}
                        onClick={() => !isDesktop && dispatch(closeChat())}
                      >
                        <Icon name={byId[ref.category]?.icon ?? 'Folder'} />
                        <span className="u-truncate">{ref.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
        {pending && (
          <p className={styles.thinking}>
            <span className={styles.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {t('thinking')}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <label htmlFor={inputId} className="u-visually-hidden">
          {t('inputLabel')}
        </label>
        <textarea
          ref={inputRef}
          id={inputId}
          rows={2}
          value={draft}
          placeholder={t('placeholder')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          dir="auto"
        />
        <Button type="submit" variant="primary" iconOnly icon={<Send className="u-flip-rtl" />} disabled={!draft.trim() || pending}>
          {t('send')}
        </Button>
      </form>
    </dialog>
  );
}
