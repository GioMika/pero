import type { FC, ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  active?: boolean;
}

export const Button: FC<ButtonProps> = ({
                                          variant = 'primary',
                                          size = 'md',
                                          children,
                                          active = false,
                                          className = '',
                                          ...props
                                        }) => {
  return (
      <button
          className={`${styles.button} ${styles[variant]} ${styles[size]} ${
              active ? styles.active : ''
          } ${className}`}
          {...props}
      >
        {children}
      </button>
  );
};