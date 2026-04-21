'use client';

import { DOCUMENT_TYPE_LABELS, Document, DocumentType } from '@data-contracts/document';

// Renders a document's metadata as a sk-web-gui–styled definition list.
// Field order mirrors sok.sundsvallsminnen.se so researchers see the same layout
// they're used to. Empty values are skipped — no walls of "—".

interface Row {
  label: string;
  value?: string;
}

const buildRows = (doc: Document): Row[] => {
  const rows: Row[] = [];

  if (doc.archiveCollection) rows.push({ label: 'Arkiv', value: doc.archiveCollection });
  rows.push({ label: 'Typ', value: DOCUMENT_TYPE_LABELS[doc.type as DocumentType] ?? doc.type });
  if (doc.accnr) rows.push({ label: 'Id', value: doc.accnr });
  if (doc.year) rows.push({ label: 'Datum', value: String(doc.year) });
  if (doc.title) rows.push({ label: 'Titel', value: doc.title });
  if (doc.creator) rows.push({ label: 'Upphovsman', value: doc.creator });
  if (doc.ort) rows.push({ label: 'Ort', value: doc.ort });
  // Only show "Plats" separately when it differs from "Ort" — otherwise the two
  // rows look duplicated.
  if (doc.plats && doc.plats !== doc.ort) rows.push({ label: 'Plats', value: doc.plats });
  if (doc.institution) rows.push({ label: 'Institution', value: doc.institution });
  if (doc.publication) {
    const c = doc.publication;
    const formatted = `${c.title ?? ''}${c.number ? ` nr ${c.number}` : ''}${c.page ? `, s. ${c.page}` : ''}`.trim();
    if (formatted) rows.push({ label: 'Publikation', value: formatted });
  } else if (doc.source) {
    rows.push({ label: 'Källa', value: doc.source });
  }
  if (doc.description) rows.push({ label: 'Kommentar', value: doc.description });
  if (doc.archiveReference) rows.push({ label: 'Arkivreferens', value: doc.archiveReference });

  return rows;
};

interface Props {
  doc: Document;
}

export const DocumentMeta: React.FC<Props> = ({ doc }) => {
  const rows = buildRows(doc);
  if (rows.length === 0) return null;

  return (
    <dl
      className="grid grid-cols-1 md:grid-cols-[10rem_1fr] gap-y-sm gap-x-lg"
      data-cy="document-meta"
    >
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-label-small text-dark-secondary md:text-right md:pt-[0.25rem]">{row.label}</dt>
          <dd className={row.label === 'Arkivreferens' ? 'text-body font-mono' : 'text-body'}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
};
