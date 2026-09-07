import type { ComponentChildren, JSX } from 'preact';

type Props = {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: (e: Event) => void;
  class?: string;
  children: ComponentChildren;
  'aria-label'?: string;
  download?: string;
  target?: string;
  rel?: string;
  hidden?: boolean;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  href,
  type = 'button',
  disabled = false,
  onClick,
  class: className,
  children,
  'aria-label': ariaLabel,
  download,
  target,
  rel,
  hidden,
}: Props) {
  const classValue = ['btn', `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', className].filter(Boolean).join(' ');
  if (href) {
    return <a class={classValue} href={href} aria-label={ariaLabel} download={download} target={target} rel={rel} hidden={hidden}>{children}</a>;
  }
  return <button class={classValue} type={type} disabled={disabled} hidden={hidden} onClick={onClick as JSX.MouseEventHandler<HTMLButtonElement>} aria-label={ariaLabel}>{children}</button>;
}
