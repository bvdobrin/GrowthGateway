import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  /** Renders only the icon; `children` becomes the accessible label. */
  iconOnly?: boolean;
  block?: boolean;
}

const classes = ({ variant = 'secondary', size = 'md', iconOnly, block }: StyleProps, extra?: string) =>
  [styles.button, styles[variant], size === 'sm' && styles.sm, iconOnly && styles.iconOnly, block && styles.block, extra]
    .filter(Boolean)
    .join(' ');

const content = (icon: ReactNode, children: ReactNode, iconOnly?: boolean, loading?: boolean) => (
  <>
    {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon}
    {iconOnly ? <span className="u-visually-hidden">{children}</span> : children}
  </>
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, icon, iconOnly, block, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, iconOnly, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      title={iconOnly && typeof children === 'string' ? children : rest.title}
      {...rest}
    >
      {content(icon, children, iconOnly, loading)}
    </button>
  );
});

export function ButtonLink({ variant, size, icon, iconOnly, block, className, children, ...rest }: LinkProps & StyleProps) {
  return (
    <Link className={classes({ variant, size, iconOnly, block }, className)} {...rest}>
      {content(icon, children, iconOnly)}
    </Link>
  );
}
