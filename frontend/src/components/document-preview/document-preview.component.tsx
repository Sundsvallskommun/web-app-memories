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

const pdfVariantOf = (doc: Document): Variant | 'text' | undefined => {
  if (isPdfFilename(findFile(doc, 'large')?.filename)) return 'large';

  const carriesText = doc.type === 'Publication' || doc.type === 'Text';
  if (carriesText && isPdfFilename(findFile(doc, 'text')?.filename)) return 'text';

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
  const pdfVariant = pdfVariantOf(doc);
  const showImage = !largeIsPdf && imageVariants(doc).length > 0;

  if (!pdfVariant && !showImage) return null;

  return (
    <div className="w-full flex flex-col gap-md" data-cy="document-preview">
      {pdfVariant ?
        <PdfPreview docId={doc.id} title={doc.title} variant={pdfVariant} />
      : <ImagePreview doc={doc} />}
    </div>
  );
};

const PdfPreview: React.FC<{ docId: string; title: string; variant: string }> = ({ docId, title, variant }) => (
  <div className="w-full" data-cy="preview-pdf">
    <iframe
      src={fileUrl(docId, variant)}
      title={title || 'PDF-förhandsvisning'}
      className="w-full h-[80vh] rounded-cards bg-white"
    />
  </div>
);

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
        Förhandsvisning saknas — filen kunde inte hämtas från arkivet.
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
