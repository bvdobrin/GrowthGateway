import { useState } from 'react';
import { Bot, ChevronDown, Info, Menu, Settings, UserRoundCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { ChatDrawer } from '@/components/ChatDrawer/ChatDrawer';
import { Dialog } from '@/components/Dialog/Dialog';
import { AccountPanel, Avatar, LanguageSwitcher, ThemeSwitcher } from '@/components/Identity/Identity';
import { Popover } from '@/components/Popover/Popover';
import { Toaster } from '@/components/Toaster/Toaster';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectChat, toggleChat } from '@/store/chatSlice';
import { useGetDashboardStatsQuery } from '@/store/damApi';
import { selectCurrentUser, selectPermissions, selectSignedInUser, viewAs } from '@/store/sessionSlice';
import { NAV_ITEMS } from './navigation';
import { ScrollManager } from './ScrollManager';
import styles from './AppShell.module.css';

function AboutLink({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('nav');
  return (
    <Link to="/info" className={styles.navLink} onClick={onNavigate}>
      <Info aria-hidden="true" />
      <span className={styles.navLabel}>{t('about')}</span>
    </Link>
  );
}

function SettingsTab() {
  const { t } = useTranslation('nav');
  return (
    <details className={styles.settingsTab}>
      <summary>
        <Settings aria-hidden="true" />
        <span>{t('settings')}</span>
      </summary>
      <div className={styles.settingsBody}>
        <LanguageSwitcher block />
        <ThemeSwitcher block />
      </div>
    </details>
  );
}

function Brand() {
  const { t } = useTranslation('nav');
  return (
    <Link to="/" className={styles.brand}>
      <img src="/favicon.svg" alt="" width={28} height={28} />
      <span className={styles.brandText}>
        <span className={styles.brandName}>{t('appName')}</span>
        <span className={styles.brandTagline}>{t('tagline')}</span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('nav');
  const { pathname } = useLocation();
  const permissions = useAppSelector(selectPermissions);
  const { data: stats } = useGetDashboardStatsQuery(undefined, { skip: !permissions.includes('asset:approve') });
  const items = NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission));

  return (
    <nav aria-label={t('mainNav')} className={styles.nav}>
      {(['work', 'governance'] as const).map((section) => {
        const sectionItems = items.filter((i) => i.section === section);
        if (!sectionItems.length) return null;
        return (
          <div key={section} className={styles.navSection}>
            <p className={styles.navHeading}>{t(`sections.${section}`)}</p>
            <ul role="list">
              {sectionItems.map((item) => {
                const active = item.match ? item.match(pathname) : pathname.startsWith(item.to);
                const count = item.to === '/approvals' ? stats?.pendingApprovalForMe : undefined;
                return (
                  <li key={item.to}>
                    <Link to={item.to} className={styles.navLink} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
                      <item.icon aria-hidden="true" />
                      <span className={styles.navLabel}>{t(item.labelKey)}</span>
                      {!!count && <span className={styles.navCount}>{count}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const { t } = useTranslation('nav');
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useAppSelector(selectCurrentUser);
  const signedIn = useAppSelector(selectSignedInUser);
  const chat = useAppSelector(selectChat);
  const viewing = user && signedIn && user.id !== signedIn.id;

  return (
    <div className="l-shell">
      <ScrollManager />
      <a href="#main" className={styles.skip}>
        {t('skipToContent')}
      </a>

      <aside className={`l-shell__sidebar ${styles.sidebar}`}>
        <Brand />
        <NavList />
        <div className={styles.sidebarFooter}>
          <AboutLink />
          <SettingsTab />
        </div>
      </aside>

      <header className={`l-shell__header ${styles.header}`}>
        <Button className="u-hide-from-lg" variant="ghost" iconOnly icon={<Menu />} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>
          {t('menu')}
        </Button>
        <div className={`u-hide-from-lg ${styles.headerBrand}`}>
          <Brand />
        </div>

        <div className={styles.headerSpacer} />

        {viewing && (
          <div className={styles.viewing} role="status" title={t('viewingAs', { name: user.name })}>
            <UserRoundCog aria-hidden="true" />
            <span className="u-truncate">{t('viewingAs', { name: user.name })}</span>
            <button type="button" className={styles.viewingReset} onClick={() => dispatch(viewAs(null))}>
              {t('stopViewingAs', { name: signedIn.name.split(' ')[0] })}
            </button>
          </div>
        )}

        <Button
          className={styles.assistant}
          variant={chat.open ? 'primary' : 'secondary'}
          icon={<Bot />}
          onClick={() => dispatch(toggleChat())}
          aria-pressed={chat.open}
          aria-label={t('assistant')}
        >
          <span className="u-hide-below-md">{t('assistant')}</span>
        </Button>

        {user && (
          <div className="u-hide-below-lg">
            <Popover
              label={t('account')}
              trigger={(props) => (
                <button type="button" className={styles.account} {...props}>
                  <Avatar user={user} size="sm" />
                  <span className={styles.accountName}>{user.name}</span>
                  <ChevronDown aria-hidden="true" />
                  <span className="u-visually-hidden">{t('account')}</span>
                </button>
              )}
            >
              {(close) => <AccountPanel onDone={close} />}
            </Popover>
          </div>
        )}
      </header>

      <main id="main" className="l-shell__main" tabIndex={-1}>
        <Outlet />
      </main>

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title={t('appName')} variant="sheetStart">
        <div className={styles.mobileMenu}>
          <NavList onNavigate={() => setMenuOpen(false)} />
          <hr />
          <AccountPanel onDone={() => setMenuOpen(false)} />
          <div className={styles.sidebarFooter}>
            <AboutLink onNavigate={() => setMenuOpen(false)} />
            <SettingsTab />
          </div>
        </div>
      </Dialog>

      <ChatDrawer />
      <Toaster />
    </div>
  );
}
