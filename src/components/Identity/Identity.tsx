import type { CSSProperties } from 'react';
import { Check, LogOut, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LOCALE_NAMES, SUPPORTED_LOCALES, type UiLocale } from '@/i18n';
import { PERSONAS } from '@/mocks/users';
import { groupName } from '@/services/iamService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, selectCurrentUser, selectSignedInUser, viewAs } from '@/store/sessionSlice';
import { selectLocale, selectPalette, selectTheme, setLocale, setPalette, toggleTheme, type Palette } from '@/store/uiSlice';
import type { User } from '@/types';
import { Button } from '../Button/Button';
import styles from './Identity.module.css';

export function Avatar({ user, size = 'md' }: { user: Pick<User, 'name' | 'avatarHue'>; size?: 'sm' | 'md' | 'lg' }) {
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <span className={`${styles.avatar} ${styles[size]}`} style={{ '--avatar-hue': user.avatarHue } as CSSProperties} aria-hidden="true">
      {initials}
    </span>
  );
}

export function LanguageSwitcher({ id, className, block }: { id?: string; className?: string; block?: boolean }) {
  const { t } = useTranslation('nav');
  const dispatch = useAppDispatch();
  const locale = useAppSelector(selectLocale);
  const control = (
    <label className={[styles.language, className].filter(Boolean).join(' ')}>
      <span className="u-visually-hidden">{t('language')}</span>
      <select id={id} value={locale} onChange={(e) => dispatch(setLocale(e.target.value as UiLocale))}>
        {SUPPORTED_LOCALES.map((lng) => (
          <option key={lng} value={lng} lang={lng}>
            {LOCALE_NAMES[lng]}
          </option>
        ))}
      </select>
    </label>
  );
  if (!block) return control;
  return (
    <div className={styles.stack}>
      <span className={styles.fieldLabel} id={id ? `${id}-label` : undefined}>
        {t('language')}
      </span>
      {control}
    </div>
  );
}

export function PaletteSwitcher({ block }: { block?: boolean }) {
  const { t } = useTranslation('nav');
  const dispatch = useAppDispatch();
  const palette = useAppSelector(selectPalette);
  const control = (
    <label className={styles.language}>
      <span className="u-visually-hidden">{t('theme.label')}</span>
      <select value={palette} onChange={(e) => dispatch(setPalette(e.target.value as Palette))}>
        <option value="blue">{t('theme.blue')}</option>
        <option value="light-modern">{t('theme.lightModern')}</option>
      </select>
    </label>
  );
  if (!block) return control;
  return (
    <div className={styles.stack}>
      <span className={styles.fieldLabel}>{t('theme.label')}</span>
      {control}
    </div>
  );
}

export function ThemeToggle() {
  const { t } = useTranslation('nav');
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <Button variant="ghost" icon={theme === 'dark' ? <Sun /> : <Moon />} onClick={() => dispatch(toggleTheme())} aria-pressed={theme === 'dark'}>
      {t('theme.toggle', { mode: t(`theme.${next}`) })}
    </Button>
  );
}

/** Demo-only impersonation: applies another persona's IdP groups and clearance. */
export function PersonaSwitcher({ onSwitched }: { onSwitched?: () => void }) {
  const { t } = useTranslation(['nav', 'common']);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const signedIn = useAppSelector(selectSignedInUser);
  const current = useAppSelector(selectCurrentUser);
  if (!signedIn || !current) return null;

  return (
    <div className={styles.switcher}>
      <p className={styles.sectionTitle}>{t('viewAs')}</p>
      <p className={styles.hint}>{t('viewAsHint')}</p>
      <ul className={styles.personas} role="list">
        {PERSONAS.map((persona) => {
          const active = persona.id === current.id;
          return (
            <li key={persona.id}>
              <button
                type="button"
                className={styles.persona}
                aria-pressed={active}
                onClick={async () => {
                  await dispatch(viewAs(persona.id === signedIn.id ? null : persona.id));
                  onSwitched?.();
                  navigate('/');
                }}
              >
                <Avatar user={persona} size="sm" />
                <span className={styles.personaText}>
                  <span className={styles.personaName}>{persona.name}</span>
                  <span className={styles.personaTitle}>
                    {persona.title} · {t(`common:classification.${persona.clearance}`)}
                  </span>
                </span>
                {active && <Check aria-hidden="true" className={styles.check} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Identity summary, persona switcher, theme and sign-out. */
export function AccountPanel({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation(['nav', 'common']);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const signedIn = useAppSelector(selectSignedInUser);
  const current = useAppSelector(selectCurrentUser);
  if (!signedIn || !current) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.identity}>
        <Avatar user={current} size="lg" />
        <div className={styles.identityText}>
          <p className={styles.identityName}>{current.name}</p>
          <p className={styles.identityMeta}>{current.title}</p>
          <p className={styles.identityMeta}>{current.organization}</p>
        </div>
      </div>
      <div className={styles.groups} aria-label={t('common:login.groups')}>
        {current.groups.map((g) => (
          <span key={g} className={styles.group} title={g}>
            {groupName(g)}
          </span>
        ))}
      </div>
      {signedIn.id !== current.id && <p className={styles.hint}>{t('signedInAs', { name: signedIn.name })}</p>}
      <hr />
      <PersonaSwitcher onSwitched={onDone} />
      <hr />
      <div className={styles.settings}>
        <ThemeToggle />
      </div>
      <Button
        variant="ghost"
        icon={<LogOut className="u-flip-rtl" />}
        onClick={async () => {
          await dispatch(logout());
          navigate('/login');
        }}
      >
        {t('signOut')}
      </Button>
    </div>
  );
}
