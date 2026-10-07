'use client';

import { useEffect, useMemo, useState } from 'react';
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

const isPdfFilename = (filename: string | undefined): boolean => !!filename && filename.toLowerCase().endsWith('.pdf');

const imageVariants = (doc: Document): Variant[] => {
  const out: Variant[] = [];
  const large = findFile(doc, 'large');
  if (large && !isPdfFilename(large.filename)) out.push('large');
  if (findFile(doc, 'thumbnail')) out.push('thumbnail');
  return out;
};

/** A PDF, or the text variant the archive serves as HTML. Both show without a click. */
const frameVariantOf = (doc: Document): Variant | 'text' | undefined => {
  if (isPdfFilename(findFile(doc, 'large')?.filename)) return 'large';

  const carriesText = doc.type === 'Publication' || doc.type === 'Text';
  if (carriesText && findFile(doc, 'text') && doc.hasTextPreview) return 'text';

  return undefined;
};

interface Props {
  doc: Document;
}

export const DocumentPreview: React.FC<Props> = ({ doc }) => {
  if (doc.type === 'Audio') {
    return (
      <div className="w-full flex justify-center" data-cy="document-preview-audio">
        <audio controls preload="metadata" src={apiURL(`documents/${doc.id}/stream`)} className="w-full max-w-2xl">
          Din webbläsare stödjer inte ljuduppspelning.
        </audio>
      </div>
    );
  }

  if (!isImageType(doc.type)) return null;

  const largeIsPdf = isPdfFilename(findFile(doc, 'large')?.filename);
  const frameVariant = frameVariantOf(doc);
  const showImage = !largeIsPdf && imageVariants(doc).length > 0;

  if (!frameVariant && !showImage) return null;

  const framedFileIsPdf = frameVariant ? isPdfFilename(findFile(doc, frameVariant)?.filename) : false;

  return (
    <div className="w-full flex flex-col gap-md" data-cy="document-preview">
      {frameVariant ?
        <FramePreview docId={doc.id} title={doc.title} variant={frameVariant} fit={!framedFileIsPdf} />
      : <ImagePreview doc={doc} />}
    </div>
  );
};

const MIN_FITTED_HEIGHT = 400;

/** Fits the document when same-origin, otherwise falls back to the tall default. */
const FramePreview: React.FC<{ docId: string; title: string; variant: string; fit: boolean }> = ({
  docId,
  title,
  variant,
  fit,
}) => {
  const [height, setHeight] = useState<number>();

  const fitToContent = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    if (!fit) return;
    try {
      const body = event.currentTarget.contentDocument?.body;
      const measured = body ? body.scrollHeight + 32 : 0;
      if (measured >= MIN_FITTED_HEIGHT) setHeight(measured);
    } catch {
      // Cross-origin, so the document cannot be measured. The default height applies.
    }
  };

  return (
    <div className="w-full" data-cy="preview-pdf">
      <iframe
        src={fileUrl(docId, variant)}
        title={title || 'Förhandsvisning'}
        onLoad={fitToContent}
        style={{ height: height ?? '85vh' }}
        className="w-full rounded-cards bg-white"
      />
    </div>
  );
};

const ImagePreview: React.FC<{ doc: Document }> = ({ doc }) => {
  const variants = useMemo(() => imageVariants(doc), [doc]);
  const selected = variants[0];
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [doc.id]);

  if (!selected) return null;

  if (failed) {
    return (
      <div className="bg-background-200 rounded-cards p-lg text-center text-dark-secondary" data-cy="preview-missing">
        Förhandsvisning saknas, filen kunde inte hämtas från arkivet.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <img
        src={fileUrl(doc.id, selected)}
        alt={doc.title || 'Förhandsvisning'}
        loading="lazy"
        className="max-h-[80vh] w-auto rounded-cards"
        onError={() => setFailed(true)}
      />
    </div>
  );
};
