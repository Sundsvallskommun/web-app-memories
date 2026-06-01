'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Modal } from '@sk-web-gui/react';
import { Document } from '@data-contracts/document';
import { apiURL } from '@utils/api-url';

// "Relaterade foton" — other Photo/Object records linked to this one via the
// FOTO_FOTO junction table. Clicking a thumbnail opens a lightbox preview of that
// record's large image (so you keep the context of the photo you're viewing),
// with a link to open its full detail page.
//
// `doc.relatedIds` is only populated on the photo detail lookup; for every other
// document type it's empty and this renders nothing. All images are fetched from
// the existing file proxy, so there's no backend dependency beyond the ids.

const thumbUrl = (relatedId: string): string => apiURL(`documents/${relatedId}/file?variant=thumbnail`);
const largeUrl = (relatedId: string): string => apiURL(`documents/${relatedId}/file?variant=large`);

// One thumbnail tile. Owns its failed state so a missing samba file degrades to a
// stable placeholder instead of a broken-image icon (and the count stays honest).
const RelatedThumb: React.FC<{ relatedId: string; onOpen: () => void }> = ({ relatedId, onOpen }) => {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Förhandsgranska relaterat foto ${relatedId}`}
      className="rounded-cards overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary"
      data-cy="related-thumb"
    >
      {failed ? (
        <div className="h-24 w-24 flex items-center justify-center border border-divider rounded-cards text-label-small text-dark-secondary">
          Saknas
        </div>
      ) : (
        <img
          src={thumbUrl(relatedId)}
          alt={`Relaterat foto ${relatedId}`}
          loading="lazy"
          className="h-24 w-24 object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </button>
  );
};

interface Props {
  doc: Document;
}

export const DocumentRelated: React.FC<Props> = ({ doc }) => {
  const router = useRouter();
  const related = doc.relatedIds ?? [];
  const [openId, setOpenId] = useState<string | undefined>(undefined);
  const [largeFailed, setLargeFailed] = useState(false);

  // Close the lightbox when navigating between records.
  useEffect(() => {
    setOpenId(undefined);
    setLargeFailed(false);
  }, [doc.id]);

  if (related.length === 0) return null;

  const open = (relatedId: string) => {
    setLargeFailed(false);
    setOpenId(relatedId);
  };

  const goToRecord = () => {
    const target = openId;
    setOpenId(undefined);
    if (target) router.push(`/dokument/${target}`);
  };

  return (
    <div className="bg-background-200 rounded-cards p-lg flex flex-col gap-md" data-cy="document-related">
      <h2 className="text-label-medium">Relaterade foton ({related.length})</h2>
      <div className="flex flex-wrap gap-sm">
        {related.map((relatedId) => (
          <RelatedThumb key={relatedId} relatedId={relatedId} onOpen={() => open(relatedId)} />
        ))}
      </div>

      <Modal show={!!openId} onClose={() => setOpenId(undefined)} label="Relaterat foto" className="max-w-3xl">
        {openId && (
          <div className="flex flex-col items-center gap-md" data-cy="related-lightbox">
            {largeFailed ? (
              <div className="text-center text-dark-secondary p-lg" data-cy="related-lightbox-missing">
                Bilden kunde inte hämtas från arkivet.
              </div>
            ) : (
              <img
                src={largeUrl(openId)}
                alt={`Relaterat foto ${openId}`}
                className="max-h-[70vh] max-w-full w-auto rounded-cards"
                onError={() => setLargeFailed(true)}
                data-cy="related-lightbox-image"
              />
            )}
            <Button color="vattjom" onClick={goToRecord} data-cy="related-lightbox-open">
              Visa hela posten
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
