import EmptyLayout from '@layouts/empty-layout/empty-layout.component';

export default function LoaderFullScreen() {
  return (
    <EmptyLayout>
      <main>
        <div className="w-screen h-screen flex place-items-center place-content-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      </main>
    </EmptyLayout>
  );
}
