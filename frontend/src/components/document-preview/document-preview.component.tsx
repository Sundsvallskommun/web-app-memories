'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@sk-web-gui/react';
import { Document, DocumentFile } from '@data-contracts/document';
import { apiURL } from '@utils/api-url';

// Inline preview for a Document. Renders the best fit for each record:
//   * <img>     — image variants of Photo / Publication / Object
//   * <iframe>  — PDF large-variant for Publication, and the transformed
//                  HTML served from variant=text on Publication
//   * <audio>   — Audio records
//   * nothing   — Film (upstream .avi is not browser-playable; the user
//                  gets metadata + download button instead)
//
// PDFs are detected by filename extension since the backend doesn't expose
// MIME on the Document model. Browsers render application/pdf inline
// natively when the API sets Content-Disposition: inline.

type Variant = 'large' | 'thumbnail';

const fileUrl = (docId: string, variant: string): string => apiURL(`documents/${docId}/file?variant=${variant}`);

const isImageType = (type: string): boolean =>
  type === 'Photo' || type === 'Publication' || type === 'Object' || type === 'Text';

const findFile = (doc: Document, variant: string): DocumentFile | undefined =>
  (doc.files ?? []).find((f) => f.variant === variant);

const isPdfFilename = (filename: string | undefined): boolean =>
  !!filename && filename.toLowerCase().endsWith('.pdf');

const imageVariants = (doc: Document): Variant[] => {
  const out: Variant[] = [];
  const large = findFile(doc, 'large');
  if (large && !isPdfFilename(large.filename)) out.push('large');
  if (findFile(doc, 'thumbnail')) out.push('thumbnail');
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
  if (doc.type === 'Audio') {
    return (
      <div className="bg-background-200 rounded-cards p-md flex justify-center" data-cy="document-preview-audio">
        <audio controls preload="metadata" src={apiURL(`documents/${doc.id}/stream`)} className="w-full max-w-2xl">
          Din webbläsare stödjer inte ljuduppspelning.
        </audio>
      </div>
    );
  }

  if (!isImageType(doc.type)) return null;

  const largeFile = findFile(doc, 'large');
  const textFile = doc.type === 'Publication' || doc.type === 'Text' ? findFile(doc, 'text') : undefined;
  const largeIsPdf = isPdfFilename(largeFile?.filename);
  const textIsPdf = isPdfFilename(textFile?.filename);
  const pdfVariant: Variant | 'text' | undefined = largeIsPdf ? 'large' : textIsPdf ? 'text' : undefined;
  const showImage = !largeIsPdf && imageVariants(doc).length > 0;
  // HtmlPreview is only for transformed text/XML; if the text variant is a PDF
  // we show it via PdfPreview instead (sandbox on HtmlPreview blocks the
  // browser's built-in PDF viewer from rendering).
  const showText = !!textFile && !textIsPdf;

  if (!pdfVariant && !showImage && !showText) return null;

  return (
    <div className="flex flex-col gap-md" data-cy="document-preview">
      {pdfVariant && <PdfPreview docId={doc.id} title={doc.title} variant={pdfVariant} />}
      {showImage && <ImagePreview doc={doc} />}
      {showText && <HtmlPreview docId={doc.id} title={doc.title} />}
    </div>
  );
};

const PdfPreview: React.FC<{ docId: string; title: string; variant: string }> = ({ docId, title, variant }) => (
  <div className="bg-background-200 rounded-cards p-md" data-cy="preview-pdf">
    <iframe
      src={fileUrl(docId, variant)}
      title={title || 'PDF-förhandsvisning'}
      className="w-full h-[80vh] rounded-cards bg-white"
    />
  </div>
);

const HtmlPreview: React.FC<{ docId: string; title: string }> = ({ docId, title }) => (
  <div className="bg-background-200 rounded-cards p-md" data-cy="preview-text">
    <iframe
      src={fileUrl(docId, 'text')}
      title={title ? `${title} (text)` : 'Textförhandsvisning'}
      sandbox="allow-same-origin"
      className="w-full h-[60vh] rounded-cards bg-white"
    />
  </div>
);

const ImagePreview: React.FC<{ doc: Document }> = ({ doc }) => {
  const variants = useMemo(() => imageVariants(doc), [doc]);
  const [selected, setSelected] = useState<Variant | undefined>(variants[0]);
  const [failed, setFailed] = useState(false);

  // Reset state when the doc changes (navigating between records).
  useEffect(() => {
    setSelected(variants[0]);
    setFailed(false);
  }, [doc.id, variants]);

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
    <div className="bg-background-200 rounded-cards p-md flex flex-col items-center gap-sm">
      <img
        src={fileUrl(doc.id, selected)}
        alt={doc.title || 'Förhandsvisning'}
        loading="lazy"
        className="max-h-[80vh] w-auto rounded-cards"
        onError={() => setFailed(true)}
      />

      {/* Only show the switch when the record has more than one image variant —
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
