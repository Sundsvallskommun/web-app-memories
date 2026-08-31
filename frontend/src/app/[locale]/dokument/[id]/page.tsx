'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import Main from '@layouts/main/main.component';
import { Alert, Breadcrumb, Button } from '@sk-web-gui/react';
import { ArrowLeft, Download } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, Document, DocumentType } from '@data-contracts/document';
import { getDocumentById } from '@services/document-service';
import { DocumentPreview, VARIANT_LABELS, Variant } from '@components/document-preview/document-preview.component';
import { DocumentGallery } from '@components/document-gallery/document-gallery.component';
import { DocumentRelated } from '@components/document-related/document-related.component';
import { DownloadError, downloadDocumentFile } from '@utils/download-file';

// Fields the design asks for that the API does not carry: Samling
// (archiveCollection is declared upstream but never populated), Skapad and
// Uppdaterat (no upstream column at all). They are left out rather than
// rendered as permanently empty rows. Add them here when the API grows them.
const metaRows = (doc: Document): { label: string; value: string }[] =>
  [
    { label: 'Objekt typ', value: DOCUMENT_TYPE_LABELS[doc.type as DocumentType] ?? doc.type },
    { label: 'Upphovsman', value: doc.creator },
    { label: 'Plats', value: doc.location },
    { label: 'Tidpunkt', value: doc.year ? String(doc.year) : '' },
  ].filter((row) => !!row.value);

const DocumentDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewVariant, setPreviewVariant] = useState<Variant | undefined>(undefined);

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      getDocumentById(id).then((result) => {
        setDoc(result);
        setLoading(false);
      });
    }
  }, [params.id]);

  const handleDownload = async () => {
    if (!doc) return;
    const file =
      doc.files?.find((f) => f.variant === previewVariant) ??
      doc.files?.find((f) => f.variant === 'large') ??
      doc.files?.[0];
    const filename = file?.filename ?? `${doc.id}.jpg`;

    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadDocumentFile(doc.id, filename, file?.variant);
    } catch (e) {
      setDownloadError(e instanceof DownloadError ? e.message : 'Nedladdningen misslyckades.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <DefaultLayout headerTitle="Sundsvallsminnen" headerSubtitle="Sök i arkivets databas">
        <Main>
          <div className="bg-background-200 rounded-cards p-24 flex flex-col items-center gap-16">
            <div className="w-full max-w-2xl aspect-[4/3] bg-[#0000001f] animate-shimmer rounded-8" />
            <div className="h-16 w-64 bg-[#0000001f] animate-shimmer rounded-8" />
          </div>
        </Main>
      </DefaultLayout>
    );
  }

  if (!doc) {
    return (
      <DefaultLayout headerTitle="Sundsvallsminnen" headerSubtitle="Sök i arkivets databas">
        <Main>
          <div className="flex flex-col items-center gap-16 py-32">
            <p>Dokumentet hittades inte.</p>
            <Button variant="tertiary" leftIcon={<ArrowLeft size={16} />} onClick={() => router.push('/')}>
              Tillbaka till sökningen
            </Button>
          </div>
        </Main>
      </DefaultLayout>
    );
  }

  const title = doc.title || '(Utan titel)';

  return (
    <DefaultLayout headerTitle="Sundsvallsminnen" headerSubtitle="Sök i arkivets databas">
      <Main>
        <div className="flex flex-col gap-24">
          <Breadcrumb>
            <Breadcrumb.Item>
              <Breadcrumb.Link href="/">Sökning</Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item currentPage>
              <Breadcrumb.Link>{title}</Breadcrumb.Link>
            </Breadcrumb.Item>
          </Breadcrumb>
          <h1 className="sr-only">{title}</h1>
          <div className="bg-background-200 rounded-cards px-72 py-40 flex flex-col gap-32">
            <div className="flex flex-col items-center gap-16">
              <DocumentPreview doc={doc} onVariantChange={setPreviewVariant} />

              {doc.description && <p className="text-center font-bold">{doc.description}</p>}

              <Button
                color="primary"
                rightIcon={<Download size={16} />}
                onClick={handleDownload}
                loading={downloading}
                data-cy="document-download"
              >
                {previewVariant ? `Ladda ned (${VARIANT_LABELS[previewVariant]})` : 'Ladda ned'}
              </Button>

              {downloadError && (
                <div role="alert" className="w-full max-w-2xl">
                  <Alert type="warning">
                    <Alert.Icon />
                    <Alert.Content>
                      <Alert.Content.Description>{downloadError}</Alert.Content.Description>
                    </Alert.Content>
                  </Alert>
                </div>
              )}
            </div>

            <dl className="flex flex-col gap-4" data-cy="document-meta">
              {metaRows(doc).map((row) => (
                <div key={row.label} className="flex gap-8">
                  <dt className="font-bold">{row.label}:</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

            {/* Extra media files (Text / TEXT_MULTI). Renders nothing for
                documents without attached media. */}
            <DocumentGallery doc={doc} />

            <DocumentRelated doc={doc} />
          </div>
        </div>
      </Main>
    </DefaultLayout>
  );
};

export default DocumentDetailPage;
