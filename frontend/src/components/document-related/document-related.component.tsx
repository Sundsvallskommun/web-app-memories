'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, Label, Table, SortMode } from '@sk-web-gui/react';
import { ArrowRight, Download } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, Document, DocumentType } from '@data-contracts/document';
import { getDocumentById } from '@services/document-service';
import { DownloadError, downloadDocumentFile } from '@utils/download-file';

type SortKey = 'type' | 'title' | 'year' | 'location';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'type', label: 'Typ' },
  { key: 'title', label: 'Titel' },
  { key: 'year', label: 'Tidpunkt' },
  { key: 'location', label: 'Plats' },
];

const compare = (a: Document, b: Document, key: SortKey): number => {
  if (key === 'year') return (a.year || 0) - (b.year || 0);
  return String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'sv');
};

interface Props {
  doc: Document;
}

export const DocumentRelated: React.FC<Props> = ({ doc }) => {
  const router = useRouter();
  const related = useMemo(() => doc.relatedIds ?? [], [doc.relatedIds]);

  const [records, setRecords] = useState<Document[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortOrder, setSortOrder] = useState<SortMode.ASC | SortMode.DESC>(SortMode.ASC);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const relatedKey = related.join(',');
  useEffect(() => {
    if (related.length === 0) return;
    let cancelled = false;

    Promise.all(related.map((relatedId) => getDocumentById(relatedId))).then((results) => {
      if (!cancelled) setRecords(results.filter((r): r is Document => !!r));
    });

    return () => {
      cancelled = true;
    };
  }, [relatedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    const factor = sortOrder === SortMode.ASC ? 1 : -1;
    return [...records].sort((a, b) => compare(a, b, sortKey) * factor);
  }, [records, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortOrder(sortOrder === SortMode.ASC ? SortMode.DESC : SortMode.ASC);
      return;
    }
    setSortKey(key);
    setSortOrder(SortMode.ASC);
  };

  const handleDownload = async (record: Document) => {
    const filename = record.files?.[0]?.filename ?? `${record.id}.jpg`;
    setDownloadError(null);
    setDownloading(record.id);
    try {
      await downloadDocumentFile(record.id, filename, record.files?.[0]?.variant);
    } catch (e) {
      setDownloadError(e instanceof DownloadError ? e.message : 'Nedladdningen misslyckades.');
    } finally {
      setDownloading(null);
    }
  };

  if (related.length === 0) return null;

  return (
    <div className="flex flex-col gap-16" data-cy="document-related">
      {downloadError && (
        <div role="alert" className="text-error" data-cy="related-download-error">
          {downloadError}
        </div>
      )}

      <Table background>
        <Table.Header>
          {COLUMNS.map((column) => (
            <Table.HeaderColumn key={column.key}>
              <Table.SortButton
                isActive={sortKey === column.key}
                sortOrder={sortKey === column.key ? sortOrder : null}
                onClick={() => handleSort(column.key)}
              >
                {column.label}
              </Table.SortButton>
            </Table.HeaderColumn>
          ))}
          <Table.HeaderColumn>
            <span className="sr-only">Åtgärder</span>
          </Table.HeaderColumn>
        </Table.Header>

        <Table.Body>
          {sorted.map((record) => (
            <Table.Row key={record.id}>
              <Table.Column>
                <Label rounded>{DOCUMENT_TYPE_LABELS[record.type as DocumentType] ?? record.type}</Label>
              </Table.Column>
              <Table.Column>{record.title || '(Utan titel)'}</Table.Column>
              <Table.Column>{record.year || '---'}</Table.Column>
              <Table.Column>{record.location || '---'}</Table.Column>
              <Table.Column>
                <div className="flex items-center justify-end gap-18">
                  <Button
                    size="sm"
                    color="primary"
                    rightIcon={<Download size={16} />}
                    onClick={() => handleDownload(record)}
                    loading={downloading === record.id}
                    disabled={downloading !== null}
                  >
                    Ladda ned
                  </Button>
                  <Button
                    iconButton
                    size="sm"
                    variant="tertiary"
                    aria-label={`Öppna ${record.title || record.id}`}
                    onClick={() => router.push(`/dokument/${record.id}`)}
                  >
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </Table.Column>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
};
