import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ReactNode } from 'react';

interface ButtonProps {
  text?: string | ReactNode;
  variant?: 'contained' | 'outlined' | 'text' | 'background';
  onClick?: () => void;
  className?: string;
  textClassName?: string;
  bgUrl?: string;
  startIcon?: string;
  endIcon?: string | boolean | 'default';
  href?: string;
}

const Button: React.FC<ButtonProps> = ({
  text,
  variant = 'contained',
  onClick,
  className,
  bgUrl,
  startIcon,
  endIcon = 'default',
  textClassName,
  href,
}) => {
  const baseStyles =
    'px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-between w-full';
  const variants = {
    contained: 'bg-black hover:bg-neutral-800 text-white',
    outlined: 'border bg-transparent text-black border-black hover:bg-gray-100',
    text: 'text-black bg-transparent',
  };

  const buttonContent = (
    <>
      {startIcon && (
        <span className={`material-symbols-outlined ${textClassName}`}>{startIcon}</span>
      )}
      {text && (
        <div className={`${endIcon ? 'w-max' : 'text-center'} text-left ${textClassName}`}>
          {text}
        </div>
      )}
      {endIcon && endIcon !== 'default' && (
        <span className="material-symbols-outlined">{endIcon}</span>
      )}
      {endIcon === 'default' ? <span className={`${textClassName}`}>→</span> : null}
    </>
  );

  const buttonClass = cn(
    variants[variant as keyof typeof variants],
    baseStyles,
    className,
    bgUrl && 'bg-cover bg-center',
  );

  const buttonStyle = bgUrl ? { backgroundImage: `url(${bgUrl})` } : {};

  return href ? (
    <Link href={href} className={buttonClass} style={buttonStyle}>
      {buttonContent}
    </Link>
  ) : (
    <button className={buttonClass} style={buttonStyle} onClick={onClick}>
      {buttonContent}
    </button>
  );
};

export default Button;
