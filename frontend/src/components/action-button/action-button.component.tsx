'use client';

import { Button } from '@sk-web-gui/react';

type ButtonProps = React.ComponentProps<typeof Button>;

interface Props extends Omit<ButtonProps, 'children' | 'iconButton' | 'rightIcon' | 'aria-label'> {
  label: string;
  icon: React.ReactElement;
  accessibleLabel?: string;
}

/**
 * A button that shows its label from lg up and collapses to its icon below.
 *
 * It renders as two elements because `iconButton` is a prop, not a class: the
 * design system turns it into `data-icon`, which the CSS uses to strip padding.
 * One element would mean overriding padding and size with !important at each
 * breakpoint. Only one of the two is ever visible, and the label lives on in
 * aria-label so the icon form stays announceable.
 */
export const ActionButton: React.FC<Props> = ({ label, icon, accessibleLabel, className, ...props }) => (
  <>
    <Button iconButton aria-label={accessibleLabel ?? label} className={`lg:hidden ${className ?? ''}`} {...props}>
      {icon}
    </Button>
    <Button rightIcon={icon} className={`hidden lg:inline-flex ${className ?? ''}`} {...props}>
      {label}
    </Button>
  </>
);

export default ActionButton;
