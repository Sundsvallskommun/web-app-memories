'use client';

import { Alert, Button, Pagination } from '@sk-web-gui/react';
import { X } from 'lucide-react';
import { SearchResult } from '@data-contracts/document';
import { DocumentCard } from '@components/document-card/document-card.component';
import { DocumentCardSkeleton } from '@components/document-card/document-card-skeleton.component';

const GRID_CLASS = 'flex flex-wrap list-none p-0 gap-24';
const GRID_ITEM_CLASS = 'flex w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]';

interface Props {
  result: SearchResult | null;
  loading: boolean;
  failed: boolean;
  page: number;
  pageSize: number;
  onRetry: () => void;
  onDismissError: () => void;
  onPageChange: (page: number) => void;
}

export const SearchResults: React.FC<Props> = ({
  result,
  loading,
  failed,
  page,
  pageSize,
  onRetry,
  onDismissError,
  onPageChange,
}) => {
  const totalPages = result?.totalPages ?? 0;

  if (loading) {
    return (
      <ul className={GRID_CLASS} aria-busy="true" aria-label="Laddar sökresultat">
        {Array.from({ length: pageSize }, (_, i) => (
          <li key={i} className={GRID_ITEM_CLASS}>
            <DocumentCardSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (failed) {
    return (
      <div role="alert" data-cy="search-error">
        <Alert type="warning">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Title>Sökningen kunde inte genomföras</Alert.Content.Title>
            <Alert.Content.Description>Det gick inte att hämta träffar just nu.</Alert.Content.Description>

            <Button variant="link" size="sm" className="mt-xs" onClick={onRetry}>
              Försök igen
            </Button>
          </Alert.Content>

          <Button iconButton variant="tertiary" size="sm" aria-label="Stäng meddelandet" onClick={onDismissError}>
            <X size={20} />
          </Button>
        </Alert>
      </div>
    );
  }

  if (result?.documents?.length === 0) {
    return (
      <div className="text-center py-xl">
        <p className="text-dark-secondary">Inga träffar hittades. Prova att ändra dina sökkriterier.</p>
      </div>
    );
  }

  return (
    <>
      {!!result?.documents?.length && (
        <ul className={GRID_CLASS} data-cy="document-grid">
          {result.documents.map((doc) => (
            <li key={doc.id} className={GRID_ITEM_CLASS}>
              <DocumentCard doc={doc} />
            </li>
          ))}
        </ul>
      )}

      {result && totalPages > 1 && (
        <div className="flex justify-center mt-lg">
          <Pagination pages={totalPages} activePage={page} changePage={onPageChange} />
        </div>
      )}
    </>
  );
};

export default SearchResults;
