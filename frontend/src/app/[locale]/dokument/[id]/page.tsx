'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import Main from '@layouts/main/main.component';
import { Alert, Breadcrumb, Button } from '@sk-web-gui/react';
import { ArrowLeft, Download } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, Document, DocumentType } from '@data-contracts/document';
import { getDocumentById } from '@services/document-service';
import { DocumentPreview } from '@components/document-preview/document-preview.component';
import { DocumentFiles } from '@components/document-files/document-files.component';
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
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    setLoading(true);
    setFailed(false);
    getDocumentById(id)
      .then(setDoc)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [params.id, retryToken]);

  const primaryFile = doc?.files?.find((f) => f.variant === 'large') ?? doc?.files?.[0];

  const handleDownload = async () => {
    if (!doc || !primaryFile) return;

    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadDocumentFile(doc.id, primaryFile.filename, primaryFile.variant);
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

  if (failed) {
    return (
      <DefaultLayout headerTitle="Sundsvallsminnen" headerSubtitle="Sök i arkivets databas">
        <Main>
          <div className="py-32" role="alert" data-cy="document-error">
            <Alert type="warning">
              <Alert.Icon />
              <Alert.Content>
                <Alert.Content.Title>Dokumentet kunde inte hämtas</Alert.Content.Title>
                <Alert.Content.Description>Det gick inte att nå arkivet just nu.</Alert.Content.Description>
                <Button variant="link" size="sm" className="mt-xs" onClick={() => setRetryToken((t) => t + 1)}>
                  Försök igen
                </Button>
              </Alert.Content>
            </Alert>
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
          <div className="bg-background-200 rounded-cards px-16 py-24 flex flex-col gap-32 md:px-72 md:py-40">
            <div className="flex flex-col items-center gap-16">
              <DocumentPreview doc={doc} />

              {doc.description && <p className="text-center font-bold">{doc.description}</p>}

              {primaryFile && (
                <Button
                  color="primary"
                  rightIcon={<Download size={16} />}
                  onClick={handleDownload}
                  loading={downloading}
                  data-cy="document-download"
                >
                  Ladda ned
                </Button>
              )}

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

            <div className="flex flex-col gap-16">
              <h2 className="text-h4-md">Detaljer</h2>
              <dl className="flex flex-col gap-4" data-cy="document-meta">
                {metaRows(doc).map((row) => (
                  <div key={row.label} className="flex gap-8">
                    <dt className="font-bold">{row.label}:</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <DocumentFiles doc={doc} />
            <DocumentGallery doc={doc} />
            <DocumentRelated doc={doc} />
          </div>
        </div>
      </Main>
    </DefaultLayout>
  );
};

export default DocumentDetailPage;
