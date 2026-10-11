import { useEffect, useId, useRef } from 'react';
import {
  Attachment01Icon,
  Camera01Icon,
  ChartLineData01Icon,
  Globe02Icon,
  Mail01Icon,
  News01Icon,
} from '@hugeicons/core-free-icons';
import { Bot, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useTaxonomy } from '@/hooks/useTaxonomy';
import { askAssistant, clearChat, closeChat, selectChat } from '@/store/chatSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAppearance } from '@/store/uiSlice';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { MarkdownView } from '../MarkdownView/MarkdownView';
import PromptBar from '../PromptBar/PromptBar';
import { ThemedAurora } from '../SoftAurora/ThemedAurora';
import styles from './ChatDrawer.module.css';

type SpeechRecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

function speechRecognition() {
  if (typeof window === 'undefined') return null;
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

/**
 * Assistant panel on a native <dialog>: modal and full screen below the `bp.lg`
 * token, a non-modal docked panel from there up.
 */
export function ChatDrawer() {
  const { t, i18n } = useTranslation('chat');
  const { t: tTax } = useTranslation('taxonomy');
  const dispatch = useAppDispatch();
  const { open, messages, pending } = useAppSelector(selectChat);
  const appearance = useAppSelector(selectAppearance);
  const modern = appearance.endsWith('modern');
  const isDesktop = useIsDesktop();
  const { byId } = useTaxonomy();
  const ref = useRef<HTMLDialogElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<{ abort: () => void } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const suggestions = t('suggestions', { returnObjects: true }) as string[];
  const canDictate = speechRecognition() !== null;

  const sources = [
    { key: 'files', name: t('bar.files'), description: t('bar.filesHint'), icon: Attachment01Icon, attach: true as const },
    { key: 'photos', name: tTax('category.photograph'), description: t('bar.photosHint'), icon: Camera01Icon },
    { key: 'press', name: tTax('category.press-release'), description: t('bar.pressHint'), icon: News01Icon },
    { key: 'reports', name: tTax('category.report'), description: t('bar.reportsHint'), icon: ChartLineData01Icon },
    { key: 'email', name: tTax('category.email'), description: t('bar.emailHint'), icon: Mail01Icon },
    { key: 'web', name: tTax('category.website-copy'), description: t('bar.webHint'), icon: Globe02Icon },
  ];
  const commands = [
    { key: 'find', name: '/find', description: t('bar.find') },
    { key: 'latest', name: '/latest', description: t('bar.latest') },
    { key: 'summarize', name: '/summarize', description: t('bar.summarize') },
    { key: 'upload', name: '/upload', description: t('bar.upload') },
    { key: 'access', name: '/access', description: t('bar.access') },
  ];
  const efforts = [t('bar.efforts.low'), t('bar.efforts.medium'), t('bar.efforts.high'), t('bar.efforts.extra'), t('bar.efforts.max')];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (dialog.open) dialog.close();
      if (isDesktop) dialog.show();
      else dialog.showModal();
      composerRef.current?.querySelector('textarea')?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, isDesktop]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, pending]);

  const ask = (question: string) => {
    const text = question.trim();
    if (!text || pending) return;
    const request = dispatch(askAssistant(text));
    requestRef.current = request;
    void request.finally(() => {
      if (requestRef.current === request) requestRef.current = null;
    });
  };

  const onSend = (text: string, meta: { attachments: string[] }) => {
    const files = meta.attachments.map((file) => file.trim()).filter(Boolean);
    ask([text.trim(), files.join(', ')].filter(Boolean).join('\n'));
  };

  const onAttach = () =>
    new Promise<string[]>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.addEventListener(
        'change',
        () => resolve([...(input.files ?? [])].map((file) => file.name)),
        { once: true },
      );
      input.click();
    });

  const onDictate = () =>
    new Promise<string>((resolve, reject) => {
      const Ctor = speechRecognition();
      if (!Ctor) {
        reject(new Error('Speech recognition is unavailable'));
        return;
      }
      const recognition = new Ctor();
      recognition.lang = i18n.language || 'en';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => resolve(event.results[0]?.[0]?.transcript ?? '');
      recognition.onerror = () => reject(new Error('Dictation failed'));
      recognition.start();
    });

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
      {open && (
        <div className={styles.aurora} aria-hidden="true">
          <ThemedAurora />
        </div>
      )}
      <header className={styles.header}>
        <span className={styles.badge} aria-hidden="true">
          <Bot />
        </span>
        <div className={styles.heading}>
          <h2 id={titleId} className={styles.title}>
            {t('title')}
          </h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={<RotateCcw />}
          onClick={() => {
            requestRef.current?.abort();
            dispatch(clearChat());
          }}
          disabled={!messages.length}
        >
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
                  <button type="button" className={styles.suggestion} onClick={() => ask(s)}>
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

      <div ref={composerRef} className={styles.composer}>
        <PromptBar
          placeholder={t('placeholder')}
          sources={sources}
          commands={commands}
          models={[{ key: 'glean', name: t('bar.model'), tag: t('bar.modelTag') }]}
          defaultModel="glean"
          efforts={efforts}
          busy={pending}
          onSend={onSend}
          onStop={() => requestRef.current?.abort()}
          onAttach={onAttach}
          onDictate={canDictate ? onDictate : undefined}
          background="var(--color-surface-sunken)"
          color="var(--color-text-default)"
          menuBackground="var(--color-surface-raised)"
          sparkColor="var(--color-border-focus)"
          width={1200}
          radius={modern ? 2 : 16}
          maxRows={4}
        />
      </div>
    </dialog>
  );
}
