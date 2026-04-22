'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@sk-web-gui/react';
import { Document } from '@data-contracts/document';
import { apiURL } from '@utils/api-url';

// Inline preview for a Document. Renders an <img> for Foto / Publikation /
// Föremål records. Film records are not previewed — the upstream archive
// stores them as .avi which no browser plays natively; users get the metadata
// + download button instead.
//
// When both `large` and `thumbnail` variants exist we default to `large`
// (better-looking at max-h-[80vh]) and expose a small switch so the user can
// flip to `thumbnail` if they want a faster-loading version (useful on mobile
// / slow links).
//
// On image load failure (e.g. samba file missing) we swap to a Swedish
// placeholder instead of leaving the broken-image icon visible.

type Variant = 'large' | 'thumbnail';

const fileUrl = (docId: string, variant: Variant): string => apiURL(`documents/${docId}/file?variant=${variant}`);

const isImageType = (type: string): boolean => type === 'Photo' || type === 'Publication' || type === 'Object';

const availableVariants = (doc: Document): Variant[] => {
  const variants = (doc.files ?? []).map((f) => f.variant).filter(Boolean) as string[];
  const out: Variant[] = [];
  if (variants.includes('large')) out.push('large');
  if (variants.includes('thumbnail')) out.push('thumbnail');
  return out;
};

const VARIANT_LABELS: Record<Variant, string> = {
  large: 'Stor',
  thumbnail: 'Liten',
};

interface Props {
  doc: Document;
}

export const DocumentPreview: React.FC<Props> = ({ doc }) => {
  const variants = useMemo(() => availableVariants(doc), [doc]);
  // Default to the best-looking option available; fall through to whatever
  // exists if `large` isn't there.
  const defaultVariant: Variant | undefined = variants[0];
  const [selected, setSelected] = useState<Variant | undefined>(defaultVariant);
  const [failed, setFailed] = useState(false);

  // Reset state when the doc changes (navigating between records).
  useEffect(() => {
    setSelected(variants[0]);
    setFailed(false);
  }, [doc.id, variants]);

  if (!isImageType(doc.type)) return null;
  if (!selected) return null;

  if (failed) {
    return (
      <div
        className="bg-background-200 rounded-cards p-lg text-center text-dark-secondary"
        data-cy="preview-missing"
      >
        Förhandsvisning saknas — filen kunde inte hämtas från arkivet.
      </div>
    );
  }

  return (
    <div className="bg-background-200 rounded-cards p-md flex flex-col items-center gap-sm" data-cy="document-preview">
      <img
        src={fileUrl(doc.id, selected)}
        alt={doc.title || 'Förhandsvisning'}
        loading="lazy"
        className="max-h-[80vh] w-auto rounded-cards"
        onError={() => setFailed(true)}
      />

      {/* Only show the switch when the record has more than one variant —
          otherwise there's nothing to toggle between. */}
      {variants.length > 1 && (
        <div
          className="inline-flex items-center gap-xs text-label-small text-dark-secondary"
          role="group"
          aria-label="Förhandsvisningsstorlek"
          data-cy="preview-size-switch"
        >
          <span>Storlek:</span>
          {variants.map((v) => {
            const isActive = v === selected;
            return (
              <Button
                key={v}
                size="sm"
                variant={isActive ? 'primary' : 'tertiary'}
                color="vattjom"
                onClick={() => {
                  setFailed(false); // retry with the new variant if a load previously failed
                  setSelected(v);
                }}
                aria-pressed={isActive}
                data-cy={`preview-size-${v}`}
              >
                {VARIANT_LABELS[v]}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};
