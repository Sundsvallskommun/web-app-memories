'use client';

import { useEffect, useState } from 'react';
import { Document } from '@data-contracts/document';
import { apiURL } from '@utils/api-url';

// Inline preview for a Document. Renders an <img> using the largest available
// variant for Foto / Publikation / Föremål. Film records are not previewed —
// the upstream archive stores them as .avi which no browser plays natively;
// users get the metadata + download button instead.
//
// No click-to-zoom: `large` IS the highest-resolution source we can serve.
// Any in-page modal or new-tab open would just render the same pixels at the
// same size. Users who want the file itself can use the download button below.
//
// On image load failure (e.g. samba file missing) we swap to a Swedish
// placeholder instead of leaving the broken-image icon visible.

const fileUrl = (docId: string, variant?: string): string => {
  const path = variant ? `documents/${docId}/file?variant=${variant}` : `documents/${docId}/file`;
  return apiURL(path);
};

const pickImageVariant = (doc: Document): string | undefined => {
  // Prefer "large" for inline display; fall back to "thumbnail" if that's all we have.
  const variants = (doc.files ?? []).map((f) => f.variant).filter(Boolean) as string[];
  if (variants.includes('large')) return 'large';
  if (variants.includes('thumbnail')) return 'thumbnail';
  return undefined;
};

const isImageType = (type: string): boolean => type === 'Photo' || type === 'Publication' || type === 'Object';

interface Props {
  doc: Document;
}

export const DocumentPreview: React.FC<Props> = ({ doc }) => {
  const [failed, setFailed] = useState(false);

  // Reset failure state when the document changes (navigating between records).
  useEffect(() => {
    setFailed(false);
  }, [doc.id]);

  if (!isImageType(doc.type)) return null;

  const variant = pickImageVariant(doc);
  if (!variant) return null;
  const src = fileUrl(doc.id, variant);

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
    <div className="bg-background-200 rounded-cards p-md flex justify-center" data-cy="document-preview">
      <img
        src={src}
        alt={doc.title || 'Förhandsvisning'}
        loading="lazy"
        className="max-h-[80vh] w-auto rounded-cards"
        onError={() => setFailed(true)}
      />
    </div>
  );
};
