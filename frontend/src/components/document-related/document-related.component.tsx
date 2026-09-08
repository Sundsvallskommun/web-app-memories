'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, Label, Table, SortMode } from '@sk-web-gui/react';
import { ArrowRight, Download } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, Document, DocumentType } from '@data-contracts/document';
import { getDocumentById } from '@services/document-service';
import { ActionButton } from '@components/action-button/action-button.component';
import { DownloadError, downloadDocumentFile } from '@utils/download-file';

type SortKey = 'type' | 'title' | 'year' | 'location';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'type', label: 'Typ' },
  { key: 'title', label: 'Titel' },
  { key: 'year', label: 'Tidpunkt' },
  { key: 'location', label: 'Plats' },
];

/**
 * Column layout, one rule per intent.
 *
 * A table cell's className lands on an inner span, so hiding or sizing a whole
 * column has to come from the wrapper. The strings stay literal because
 * Tailwind scans source text for complete class names and generates nothing for
 * anything built from variables.
 */
const TABLE_LAYOUT = [
  // Tidpunkt holds a four-digit year and the actions are buttons, so both take
  // their content's width and the rest goes to Titel and Plats.
  '[&_th:nth-child(3)]:w-px [&_th:last-child]:w-px',
  // Typ appears at lg
  '[&_td:nth-child(1)]:hidden [&_th:nth-child(1)]:hidden lg:[&_td:nth-child(1)]:table-cell lg:[&_th:nth-child(1)]:table-cell',
  // Tidpunkt appears at lg
  '[&_td:nth-child(3)]:hidden [&_th:nth-child(3)]:hidden lg:[&_td:nth-child(3)]:table-cell lg:[&_th:nth-child(3)]:table-cell',
  // Plats appears at md
  '[&_td:nth-child(4)]:hidden [&_th:nth-child(4)]:hidden md:[&_td:nth-child(4)]:table-cell md:[&_th:nth-child(4)]:table-cell',
  // The header, and with it sorting, appears once there is more than one column
  '[&_thead]:hidden md:[&_thead]:table-header-group',
].join(' ');

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

    Promise.allSettled(related.map((relatedId) => getDocumentById(relatedId))).then((results) => {
      if (cancelled) return;
      setRecords(
        results
          .filter((r): r is PromiseFulfilledResult<Document | null> => r.status === 'fulfilled')
          .map((r) => r.value)
          .filter((r): r is Document => !!r)
      );
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

  // Records exist with no files at all, and the file endpoint 404s for them, so
  // the download is hidden rather than offered and left to fail.
  const primaryFile = (record: Document) => record.files?.find((f) => f.variant === 'large') ?? record.files?.[0];

  const handleDownload = async (record: Document) => {
    const file = primaryFile(record);
    if (!file) return;

    setDownloadError(null);
    setDownloading(record.id);
    try {
      await downloadDocumentFile(record.id, file?.filename, file?.variant);
    } catch (e) {
      setDownloadError(e instanceof DownloadError ? e.message : 'Nedladdningen misslyckades.');
    } finally {
      setDownloading(null);
    }
  };

  if (related.length === 0) return null;

  return (
    <div className="flex flex-col gap-16" data-cy="document-related">
      <h2 className="text-h4-md">Relaterade dokument</h2>
      {downloadError && (
        <div role="alert" className="text-error" data-cy="related-download-error">
          {downloadError}
        </div>
      )}

      <Table background className={TABLE_LAYOUT}>
        <Table.Header>
          {COLUMNS.map((column) => (
            <Table.HeaderColumn key={column.key} className={column.key === 'year' ? '!px-8' : undefined}>
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
              <Table.Column className="!px-8">{record.year || '---'}</Table.Column>
              <Table.Column>{record.location || '---'}</Table.Column>
              <Table.Column className="justify-end">
                <div className="flex flex-col items-end gap-8 whitespace-nowrap sm:flex-row sm:items-center sm:gap-18">
                  {primaryFile(record) && (
                    <ActionButton
                      label="Ladda ned"
                      accessibleLabel={`Ladda ned ${record.title || record.id}`}
                      icon={<Download size={16} />}
                      size="sm"
                      color="primary"
                      onClick={() => handleDownload(record)}
                      loading={downloading === record.id}
                      disabled={downloading !== null}
                    />
                  )}
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
