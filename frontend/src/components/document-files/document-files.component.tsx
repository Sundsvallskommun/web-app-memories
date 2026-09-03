'use client';

import { useState } from 'react';
import { Button, Label, Modal, Table } from '@sk-web-gui/react';
import { Download, Eye } from 'lucide-react';
import { Document, DocumentFile } from '@data-contracts/document';
import { apiURL } from '@utils/api-url';
import { ActionButton } from '@components/action-button/action-button.component';
import { DownloadError, downloadDocumentFile } from '@utils/download-file';

const VARIANT_LABELS: Record<string, string> = {
  large: 'Stor',
  thumbnail: 'Liten',
  text: 'Text',
};

const variantLabel = (file: DocumentFile): string => VARIANT_LABELS[file.variant ?? ''] ?? 'Fil';

const fileUrl = (docId: string, file: DocumentFile): string => {
  const query = file.variant ? `?variant=${file.variant}` : '';
  return apiURL(`documents/${docId}/file${query}`);
};

/**
 * Column layout, one rule per intent.
 *
 * A table cell's className lands on an inner span, so hiding or sizing a whole
 * column has to come from the wrapper. The strings stay literal because
 * Tailwind scans source text for complete class names and generates nothing for
 * anything built from variables.
 */
const TABLE_LAYOUT = [
  // The actions are buttons, so they take their content's width and the rest
  // goes to the filename.
  '[&_th:last-child]:w-px',
  // Typ appears at lg
  '[&_td:nth-child(1)]:hidden [&_th:nth-child(1)]:hidden lg:[&_td:nth-child(1)]:table-cell lg:[&_th:nth-child(1)]:table-cell',
  // Format appears at md
  '[&_td:nth-child(3)]:hidden [&_th:nth-child(3)]:hidden md:[&_td:nth-child(3)]:table-cell md:[&_th:nth-child(3)]:table-cell',
  // The header appears once there is more than the filename to name
  '[&_thead]:hidden md:[&_thead]:table-header-group',
].join(' ');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.webp']);
const TEXT_EXTENSIONS = new Set(['.xml', '.html', '.htm', '.txt']);

/**
 * How to preview a file, decided from its name rather than its variant: a
 * publication's `large` is usually a scan but is sometimes a PDF, and the OCR
 * `text` can be either. Guessing from the variant renders a PDF into an <img>.
 *
 * 'text' covers the OCR, which the API stores as XML and serves as HTML.
 */
type PreviewKind = 'image' | 'pdf' | 'text' | 'none';

const previewKind = (file: DocumentFile): PreviewKind => {
  const name = (file.filename ?? '').toLowerCase();
  const dot = name.lastIndexOf('.');
  const extension = dot > 0 ? name.slice(dot) : '';

  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (extension === '.pdf') return 'pdf';
  if (TEXT_EXTENSIONS.has(extension)) return 'text';
  return 'none';
};

const FilePreview: React.FC<{ docId: string; file: DocumentFile; title: string }> = ({ docId, file, title }) => {
  const src = fileUrl(docId, file);

  switch (previewKind(file)) {
    case 'image':
      return <img src={src} alt={title || file.filename} className="max-h-[70vh] max-w-full w-auto rounded-cards" />;
    case 'pdf':
      // No sandbox: it blocks the browser's built-in PDF viewer.
      return <iframe src={src} title={file.filename} className="w-full h-[70vh] rounded-cards bg-white" />;
    case 'text':
      return (
        <iframe
          src={src}
          title={file.filename}
          sandbox="allow-same-origin"
          className="w-full h-[70vh] rounded-cards bg-white"
        />
      );
    default:
      // Film and audio are downloads, not something the archive renders inline.
      return <p className="text-center">Den här filen går inte att förhandsgranska. Ladda ned den i stället.</p>;
  }
};

interface Props {
  doc: Document;
}

export const DocumentFiles: React.FC<Props> = ({ doc }) => {
  const files = doc.files ?? [];

  const [shown, setShown] = useState<DocumentFile | undefined>(undefined);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async (file: DocumentFile) => {
    setDownloadError(null);
    setDownloading(file.filename);
    try {
      await downloadDocumentFile(doc.id, file.filename, file.variant);
    } catch (e) {
      setDownloadError(e instanceof DownloadError ? e.message : 'Nedladdningen misslyckades.');
    } finally {
      setDownloading(null);
    }
  };

  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-16" data-cy="document-files">
      <h2 className="text-h4-md">Filer</h2>
      {downloadError && (
        <div role="alert" className="text-error" data-cy="files-download-error">
          {downloadError}
        </div>
      )}

      <Table background className={TABLE_LAYOUT}>
        <Table.Header>
          <Table.HeaderColumn>Typ</Table.HeaderColumn>
          <Table.HeaderColumn>Titel</Table.HeaderColumn>
          <Table.HeaderColumn>Format</Table.HeaderColumn>
          <Table.HeaderColumn>
            <span className="sr-only">Åtgärder</span>
          </Table.HeaderColumn>
        </Table.Header>

        <Table.Body>
          {files.map((file) => (
            <Table.Row key={file.filename}>
              <Table.Column>
                <Label rounded>{variantLabel(file)}</Label>
              </Table.Column>
              <Table.Column>
                <span className="break-all">{file.filename}</span>
              </Table.Column>
              <Table.Column>{file.format}</Table.Column>
              <Table.Column className="justify-end">
                <div className="flex flex-col items-end gap-8 whitespace-nowrap sm:flex-row sm:items-center">
                  <ActionButton
                    label="Ladda ned"
                    accessibleLabel={`Ladda ned ${file.filename}`}
                    icon={<Download size={16} />}
                    size="sm"
                    color="primary"
                    onClick={() => handleDownload(file)}
                    loading={downloading === file.filename}
                    disabled={downloading !== null}
                  />
                  <ActionButton
                    label="Visa"
                    accessibleLabel={`Visa ${file.filename}`}
                    icon={<Eye size={16} />}
                    size="sm"
                    variant="tertiary"
                    onClick={() => setShown(file)}
                    data-cy="file-show"
                  />
                </div>
              </Table.Column>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <Modal
        show={!!shown}
        onClose={() => setShown(undefined)}
        label={shown ? `${variantLabel(shown)} (${shown.format})` : ''}
        className="w-full max-w-4xl"
      >
        {shown && (
          <div className="flex flex-col items-center gap-16" data-cy="file-modal">
            <FilePreview docId={doc.id} file={shown} title={doc.title} />

            <Button
              color="primary"
              rightIcon={<Download size={16} />}
              onClick={() => handleDownload(shown)}
              loading={downloading === shown.filename}
            >
              Ladda ned
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentFiles;
