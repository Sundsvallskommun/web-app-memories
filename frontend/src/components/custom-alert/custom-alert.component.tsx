'use client';

import { Button } from '@sk-web-gui/react';
import { AlertTriangle, X } from 'lucide-react';

// Stands in for @sk-web-gui's Alert. That component's alert-icon calls
// forwardRef with the wrong arity, which React 19 reports as a console error on
// module evaluation, so the design is reproduced here instead. Swap back once
// the design system moves past @sk-web-gui/alert 1.1.2.

interface CustomAlertProps {
  title: string;
  description?: React.ReactNode;
  /** Renders an action button after the description when both are provided. */
  buttonLabel?: string;
  onButtonClick?: () => void;
  /** Renders the dismiss control when provided. */
  onClose?: () => void;
  'data-cy'?: string;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  title,
  description,
  buttonLabel,
  onButtonClick,
  onClose,
  'data-cy': dataCy,
}) => (
  <div
    role="alert"
    className="flex items-start gap-sm rounded-cards border-1 border-solid border-warning-surface-primary bg-warning-surface-accent-hover p-16"
    data-cy={dataCy}
  >
    <AlertTriangle size={20} className="shrink-0 mt-2 text-warning-surface-primary" aria-hidden="true" />

    <div className="grow">
      <p className="m-0 font-bold">{title}</p>
      {description && <p className="m-0">{description}</p>}

      {buttonLabel && onButtonClick && (
        <Button variant="link" size="sm" className="mt-xs" onClick={onButtonClick}>
          {buttonLabel}
        </Button>
      )}
    </div>

    {onClose && (
      <Button iconButton variant="tertiary" size="sm" aria-label="Stäng meddelandet" onClick={onClose}>
        <X size={20} />
      </Button>
    )}
  </div>
);

export default CustomAlert;
