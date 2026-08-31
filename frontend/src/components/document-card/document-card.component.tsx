'use client';

import { useState } from 'react';
import { Button, Card, Icon } from '@sk-web-gui/react';
import { ArrowRight, FileText, Image as ImageIcon, Music, Package, User, Video } from 'lucide-react';
import { Document } from '@data-contracts/document';
import { apiURL } from '@utils/api-url';

const PLACEHOLDER_ICONS: Record<string, React.ReactNode> = {
  Photo: <ImageIcon size={32} />,
  Object: <Package size={32} />,
  Film: <Video size={32} />,
  Audio: <Music size={32} />,
  Text: <FileText size={32} />,
  Publication: <FileText size={32} />,
  Person: <User size={32} />,
};

const TYPES_WITH_THUMBNAILS = new Set(['Photo', 'Object', 'Publication', 'Text']);

interface DocumentCardProps {
  doc: Document;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ doc }) => {
  const [imageFailed, setImageFailed] = useState(false);

  const showImage = TYPES_WITH_THUMBNAILS.has(doc.type) && !imageFailed;

  return (
    <Card
      href={`/dokument/${doc.id}`}
      useHoverEffect
      layout="vertical"
      className="w-full !bg-background-200 hover:!bg-tertiary-surface rounded-8 [&_.sk-card-body-icon]:!hidden [&_.sk-card-body-wrapper]:!grow"
      data-cy="document-card"
    >
      <div className="w-full aspect-video shrink-0 overflow-hidden rounded-t-8 bg-background-200">
        {showImage ?
          <Card.Image
            src={apiURL(`documents/${doc.id}/file?variant=thumbnail`)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover !rounded-none"
            onError={() => setImageFailed(true)}
          />
        : <div className="flex h-full items-center justify-center text-dark-secondary" aria-hidden="true">
            {PLACEHOLDER_ICONS[doc.type] ?? <FileText size={32} />}
          </div>
        }
      </div>

      <Card.Body className="grow flex flex-col p-16">
        <Card.Header>
          <h2 className="line-clamp-2 !text-h4-md underline">{doc.title || '(Utan titel)'}</h2>
        </Card.Header>

        <Card.Text>
          <Field label="Tidpunkt" value={doc.year ? String(doc.year) : undefined} />
          <Field label="Samling" value={doc.archiveCollection} />
          <Field label="Plats" value={doc.location} />
          <Field label="Skapad" value={doc.created} />
        </Card.Text>

        <div className="mt-auto pt-16 flex justify-end">
          <Button as="div" iconButton variant="tertiary" size="sm" showBackground aria-hidden="true" tabIndex={-1}>
            <Icon icon={<ArrowRight />} size={20} />
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

const Field: React.FC<{ label: string; value?: string }> = ({ label, value }) =>
  value ?
    <p className="m-0 !text-dark-primary">
      {label}: {value}
    </p>
  : null;

export default DocumentCard;
