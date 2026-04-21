'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import Main from '@layouts/main/main.component';
import { Button, Chip, Table } from '@sk-web-gui/react';
import { ArrowLeft, Download, FileText, Image, Music, Video, Package } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, Document, DocumentType } from '@data-contracts/document';
import { getDocumentById } from '@services/document-service';
import { DocumentPreview } from '@components/document-preview/document-preview.component';
import { DocumentMeta } from '@components/document-meta/document-meta.component';

const typeIcons: Record<string, React.ReactNode> = {
  Text: <FileText size={20} />,
  Publication: <FileText size={20} />,
  Photo: <Image size={20} />,
  Karta: <Image size={20} />,
  Ritning: <Image size={20} />,
  Ljud: <Music size={20} />,
  Film: <Video size={20} />,
  Object: <Package size={20} />,
};

const DocumentDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (id) {
      getDocumentById(id).then((result) => {
        setDoc(result);
        setLoading(false);
      });
    }
  }, [params.id]);

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (filename: string, variant?: string) => {
    const id = params.id as string;
    const base = process.env.NEXT_PUBLIC_API_URL || '/api';
    const url = variant
      ? `${base}/documents/${id}/file?variant=${variant}`
      : `${base}/documents/${id}/file`;

    // Fetch first so we can detect 404 (file missing on samba) and show a friendly
    // message instead of letting the browser render its raw error page.
    setDownloadError(null);
    setDownloading(filename);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          setDownloadError(`Filen "${filename}" saknas i arkivet. Det här är en känd lucka i digitaliseringen — kontakta arkivet om du behöver originalet.`);
        } else {
          setDownloadError(`Kunde inte hämta "${filename}" (felkod ${res.status}).`);
        }
        return;
      }
      // Stream the blob to a temporary object URL the browser will download.
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setDownloadError(`Nedladdningen misslyckades: ${e instanceof Error ? e.message : 'okänt fel'}.`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <DefaultLayout headerTitle="Sundsvallsminnen" headerSubtitle="Sök i arkivet">
        <Main>
          <div className="flex justify-center py-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          </div>
        </Main>
      </DefaultLayout>
    );
  }

  if (!doc) {
    return (
      <DefaultLayout headerTitle="Sundsvallsminnen" headerSubtitle="Sök i arkivet">
        <Main>
          <div className="flex flex-col items-center gap-md py-xl">
            <p className="text-body">Dokumentet hittades inte.</p>
            <Button variant="tertiary" leftIcon={<ArrowLeft size={16} />} onClick={() => router.push('/')}>
              Tillbaka till sökningen
            </Button>
          </div>
        </Main>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout headerTitle="Sundsvallsminnen" headerSubtitle="Sök i arkivet">
      <Main>
        <div className="flex flex-col gap-lg">
          {/* Back button */}
          <div>
            <Button variant="tertiary" leftIcon={<ArrowLeft size={16} />} onClick={() => router.back()}>
              Tillbaka till sökningen
            </Button>
          </div>

          {/* Title + type */}
          <div className="flex flex-col gap-sm">
            <div className="flex items-center gap-sm">
              <span className="text-dark-secondary">{typeIcons[doc.type]}</span>
              <Chip strong>{DOCUMENT_TYPE_LABELS[doc.type as DocumentType] ?? doc.type}</Chip>
            </div>
            <h1 className="text-h2-sm md:text-h2-md">{doc.title || '(Utan titel)'}</h1>
          </div>

          {/* Inline preview (image / video) — placed first so the asset is the
              user's primary anchor on the page. Component handles its own 404
              fallback so a missing samba file doesn't break layout. */}
          <DocumentPreview doc={doc} />

          {/* Metadata in legacy field order (matches sok.sundsvallsminnen.se). */}
          <div className="bg-background-200 rounded-cards p-lg">
            <h2 className="text-label-medium mb-md">Uppgifter</h2>
            <DocumentMeta doc={doc} />
          </div>

          {/* Files / Downloads */}
          {doc.files && doc.files.length > 0 && (
            <div className="bg-background-200 rounded-cards p-lg">
              <h2 className="text-label-medium mb-md">Filer</h2>
              {downloadError && (
                <div
                  role="alert"
                  className="mb-md p-sm rounded-cards bg-error-surface text-error-text border border-error"
                >
                  {downloadError}
                </div>
              )}
              <Table>
                <Table.Header>
                  <Table.HeaderColumn>Filnamn</Table.HeaderColumn>
                  <Table.HeaderColumn>Format</Table.HeaderColumn>
                  <Table.HeaderColumn>Storlek</Table.HeaderColumn>
                  <Table.HeaderColumn></Table.HeaderColumn>
                </Table.Header>
                <Table.Body>
                  {doc.files.map((file, i) => (
                    <Table.Row key={i}>
                      <Table.Column>{file.filename}</Table.Column>
                      <Table.Column>{file.format}</Table.Column>
                      <Table.Column>{file.size}</Table.Column>
                      <Table.Column>
                        <Button
                          size="sm"
                          color="vattjom"
                          leftIcon={<Download size={14} />}
                          onClick={() => handleDownload(file.filename, file.variant)}
                          loading={downloading === file.filename}
                          disabled={downloading !== null}
                        >
                          Ladda ner
                        </Button>
                      </Table.Column>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          )}
        </div>
      </Main>
    </DefaultLayout>
  );
};

export default DocumentDetailPage;