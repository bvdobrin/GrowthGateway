import { useMemo, useState } from 'react';
import { ArrowRight, Building2, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import CircularCarousel from '@/components/CircularCarousel/CircularCarousel';
import { LanguageSwitcher } from '@/components/Identity/Identity';
import { useDocumentTitle } from '@/hooks/useAppHelpers';
import { listPersonas, IDP_NAME } from '@/services/authService';
import { groupName } from '@/services/iamService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login, selectIsAuthenticated } from '@/store/sessionSlice';
import type { User } from '@/types';
import styles from './LoginPage.module.css';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Square portrait the carousel can crop. Hue matches the rest of the identity avatars. */
const personaPortrait = (user: User) => {
  const hue = user.avatarHue;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="oklch(66% 0.11 ${hue})"/>
        <stop offset="100%" stop-color="oklch(42% 0.14 ${hue})"/>
      </linearGradient>
    </defs>
    <rect width="900" height="900" fill="url(#bg)"/>
    <circle cx="450" cy="400" r="176" fill="oklch(98% 0.01 ${hue})" fill-opacity="0.18"/>
    <text x="450" y="418" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="ui-sans-serif, system-ui, sans-serif" font-size="156" font-weight="700">${initialsOf(user.name)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export function LoginPage() {
  const { t } = useTranslation(['common', 'nav']);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const authenticated = useAppSelector(selectIsAuthenticated);
  const { status, pendingPersonaId, error } = useAppSelector((s) => s.session);
  useDocumentTitle(t('login.title'));

  const personas = listPersonas();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = personas[activeIndex] ?? personas[0];
  const signingIn = status === 'signing_in';

  const items = useMemo(
    () =>
      personas.map((persona) => ({
        src: personaPortrait(persona),
        alt: `${persona.name}, ${persona.title}`,
        title: persona.name,
        subtitle: persona.title,
      })),
    [personas],
  );

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  if (authenticated && status !== 'signing_in') return <Navigate to={from} replace />;

  const signIn = async (personaId: string) => {
    if (signingIn) return;
    const result = await dispatch(login(personaId));
    if (login.fulfilled.match(result)) navigate(from, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <LanguageSwitcher />
      </div>
      <main className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <img src="/favicon.svg" alt="" width={44} height={44} />
        </div>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>{t('login.title')}</h1>
            <p className={styles.subtitle}>{t('login.subtitle')}</p>
          </div>
        </header>

        <section aria-labelledby="persona-heading" className={styles.section}>
          <h2 id="persona-heading" className={styles.sectionTitle}>
            <KeyRound aria-hidden="true" />
            {t('login.choosePersona')}
          </h2>
          <p className={styles.hint}>{t('login.personaHint')}</p>

          <div className={styles.stage}>
            <CircularCarousel
              items={items}
              preset="orbit"
              intro="rise"
              cardWidth={210}
              aspectRatio={1}
              gap={36}
              autoplay="off"
              captions
              fadeColor="var(--color-surface-base)"
              depthFade={0.35}
              cornerRadius={20}
              draggable={!signingIn}
              focusOnClick={!signingIn}
              ariaLabel={t('login.choosePersona')}
              onChange={setActiveIndex}
              onItemClick={(_item, index) => {
                const persona = personas[index];
                if (persona && index === activeIndex) void signIn(persona.id);
              }}
            />
          </div>

          {active && (
            <div className={styles.summary}>
              <p className={styles.personaName}>
                {active.name}
                {active.external && <span className={styles.external}>{t('login.external')}</span>}
              </p>
              <p className={styles.personaMeta}>
                <Building2 aria-hidden="true" />
                {active.organization} · {t(`region.${active.region}`)} · {t('login.clearance')}: {t(`classification.${active.clearance}`)}
              </p>
              <div className={styles.groups}>
                {active.groups.slice(0, 4).map((g) => (
                  <span key={g} className={styles.group}>
                    {groupName(g)}
                  </span>
                ))}
                {active.groups.length > 4 && <span className={styles.group}>+{active.groups.length - 4}</span>}
              </div>
              <Button
                variant="primary"
                icon={<ArrowRight className="u-flip-rtl" />}
                disabled={signingIn}
                loading={signingIn && pendingPersonaId === active.id}
                onClick={() => void signIn(active.id)}
              >
                {active.name}
              </Button>
              {signingIn && (
                <p className={styles.redirecting} role="status">
                  {t('login.redirecting', { idp: IDP_NAME })}
                </p>
              )}
            </div>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {t('login.failed')}
            </p>
          )}
        </section>
        <p className={styles.demo}>{t('nav:demo')}</p>
      </main>
    </div>
  );
}
