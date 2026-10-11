import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ButtonLink } from '@/components/Button/Button';
import { LanguageSwitcher } from '@/components/Identity/Identity';
import MorphSlider from '@/components/MorphSlider/MorphSlider';
import { useDocumentTitle } from '@/hooks/useAppHelpers';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated } from '@/store/sessionSlice';
import styles from './InfoPage.module.css';

const IMAGES = ['/info/DSC01857.jpg', '/info/DSC01876.jpg', '/info/DSC03283.jpg'] as const;
const SLIDE_KEYS = ['one', 'two', 'three'] as const;

export function InfoPage() {
  const { t } = useTranslation('intro');
  const authenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [index, setIndex] = useState(0);
  useDocumentTitle(t('pageTitle'));

  const items = useMemo(
    () =>
      SLIDE_KEYS.map((key, i) => ({
        image: IMAGES[i],
        caption: t(`slides.${key}.caption`),
      })),
    [t],
  );

  const slideKey = SLIDE_KEYS[index] ?? 'one';

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <MorphSlider
          items={items}
          transition="melt"
          intensity={0.55}
          aberration={0.35}
          drift={0.4}
          autoplay
          autoplayDelay={8}
          radius={0}
          overlayColor="#061018"
          showCaptions={false}
          onIndexChange={setIndex}
        />
      </div>

      <header className={styles.top}>
        <p className={styles.brand}>GrowthGateway</p>
        <LanguageSwitcher className={styles.language} />
      </header>

      <section className={styles.copy} aria-live="polite">
        <p className={styles.kicker}>{t(`slides.${slideKey}.kicker`)}</p>
        <h1>{t(`slides.${slideKey}.title`)}</h1>
        <p>{t(`slides.${slideKey}.body`)}</p>
        {authenticated ? (
          <ButtonLink to="/" variant="primary">
            {t('enter')}
          </ButtonLink>
        ) : (
          <ButtonLink to="/login" state={from ? { from } : undefined} variant="primary">
            {t('signIn')}
          </ButtonLink>
        )}
      </section>

      <p className={styles.credit}>© Bogdan Dobrin</p>
    </div>
  );
}
