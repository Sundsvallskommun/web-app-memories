const BLOCK = 'bg-[#0000001f] animate-shimmer';

export const DocumentCardSkeleton: React.FC = () => (
  <div className="w-full flex flex-col bg-background-200 rounded-8" data-cy="document-card-skeleton">
    <div className={`w-full aspect-video shrink-0 rounded-t-8 ${BLOCK}`} />

    <div className="flex grow flex-col gap-8 px-24 pb-24 pt-16">
      <div className={`h-28 w-4/5 rounded-groups ${BLOCK}`} />
      <div className={`h-16 w-2/5 rounded-groups ${BLOCK}`} />
      <div className={`h-16 w-3/5 rounded-groups ${BLOCK}`} />

      <div className="mt-auto pt-16 flex justify-end">
        <div className={`h-40 w-40 rounded-8 ${BLOCK}`} />
      </div>
    </div>
  </div>
);

export default DocumentCardSkeleton;
