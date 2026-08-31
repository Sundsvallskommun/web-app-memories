import { apiURL } from '@utils/api-url';

export class DownloadError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'DownloadError';
  }
}

export const downloadDocumentFile = async (docId: string, filename: string, variant?: string): Promise<void> => {
  const url = apiURL(`documents/${docId}/file${variant ? `?variant=${variant}` : ''}`);

  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new DownloadError(`Nedladdningen misslyckades: ${e instanceof Error ? e.message : 'okänt fel'}.`);
  }

  if (!res.ok) {
    throw new DownloadError(
      res.status === 404 ?
        `Filen "${filename}" saknas i arkivet. Det här är en känd lucka i digitaliseringen. Kontakta arkivet om du behöver originalet.`
      : `Kunde inte hämta "${filename}" (felkod ${res.status}).`,
      res.status
    );
  }

  const blobUrl = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
};
