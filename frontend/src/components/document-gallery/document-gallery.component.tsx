'use client';

import { useEffect, useMemo, useState } from 'react';
import { Document, DocumentMediaItem } from '@data-contracts/document';
import { apiURL } from '@utils/api-url';

// Gallery of a Text record's extra media files (TEXT_MULTI). Each item is fetched
// from the BFF media proxy: /documents/:id/media/:mediaId/file?variant=... . Shows
// the selected item large with a thumbnail strip to switch between images.
//
// `doc.media` is only populated on the detail lookup; for every other document
// type (and Text search results) it's empty and the component renders nothing.
//
// Graceful degradation: the archive sometimes lists media whose file is missing on
// the share. Any image that fails to load is dropped (its thumbnail disappears and
// the large view advances to the next available one); if every image is missing the
// whole "Bilder" section is hidden rather than showing broken images.

const mediaUrl = (docId: string, mediaId: number, variant: string): string =>
  apiURL(`documents/${docId}/media/${mediaId}/file?variant=${variant}`);

// First available variant from `preferred`, falling back to whatever the item has.
const pickVariant = (item: DocumentMediaItem, preferred: string[]): string | undefined =>
  preferred.find((v) => item.variants.includes(v)) ?? item.variants[0];

interface Props {
  doc: Document;
}

export const DocumentGallery: React.FC<Props> = ({ doc }) => {
  const media = useMemo(() => doc.media ?? [], [doc.media]);
  const [selectedId, setSelectedId] = useState<number | undefined>(media[0]?.id);
  // Ids whose image 404'd on the share — dropped from the gallery.
  const [failedIds, setFailedIds] = useState<Set<number>>(new Set());

  // Reset when navigating between records.
  useEffect(() => {
    setSelectedId(media[0]?.id);
    setFailedIds(new Set());
  }, [doc.id, media]);

  const visible = media.filter((m) => !failedIds.has(m.id));
  if (visible.length === 0) return null;

  const markFailed = (id: number) => setFailedIds((prev) => new Set(prev).add(id));

  // Keep the selection valid as items drop out (failed selection → first remaining).
  const selected = visible.find((m) => m.id === selectedId) ?? visible[0];
  const largeVariant = pickVariant(selected, ['large', 'original', 'thumbnail']);

  return (
    <div className="bg-background-200 rounded-cards p-lg flex flex-col gap-md" data-cy="document-gallery">
      <h2 className="text-label-medium">Bilder ({visible.length})</h2>

      {/* Selected image, shown large */}
      <div className="flex justify-center">
        {largeVariant && (
          <img
            // key forces a fresh element per selection so onError maps to the right id
            key={selected.id}
            src={mediaUrl(doc.id, selected.id, largeVariant)}
            alt={doc.title ? `${doc.title} – bild ${selected.id}` : `Bild ${selected.id}`}
            loading="lazy"
            className="max-h-[70vh] w-auto rounded-cards"
            onError={() => markFailed(selected.id)}
            data-cy="gallery-large"
          />
        )}
      </div>

      {/* Thumbnail strip — only when there's more than one image to switch between */}
      {visible.length > 1 && (
        <div className="flex flex-wrap gap-sm justify-center" role="group" aria-label="Fler bilder">
          {visible.map((item) => {
            const thumbVariant = pickVariant(item, ['thumbnail', 'large', 'original']);
            if (!thumbVariant) return null;
            const isActive = item.id === selected.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                aria-pressed={isActive}
                aria-label={`Visa bild ${item.id}`}
                className={`rounded-cards overflow-hidden border-2 ${isActive ? 'border-primary' : 'border-transparent'}`}
                data-cy="gallery-thumb"
              >
                <img
                  src={mediaUrl(doc.id, item.id, thumbVariant)}
                  alt={`Miniatyr ${item.id}`}
                  loading="lazy"
                  className="h-20 w-20 object-cover"
                  onError={() => markFailed(item.id)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
