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

const filenameFromResponse = (res: Response): string | undefined => {
  const header = res.headers.get('content-disposition') ?? '';

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  return /filename="?([^";]+)"?/i.exec(header)?.[1];
};

const extensionOf = (name: string | undefined): string | undefined => {
  const dot = name?.lastIndexOf('.') ?? -1;
  return dot > 0 ? name?.slice(dot).toLowerCase() : undefined;
};

const EXTENSION_BY_TYPE: Record<string, string> = {
  'text/html': '.html',
  'text/plain': '.txt',
  'text/xml': '.xml',
  'application/xml': '.xml',
  'application/pdf': '.pdf',
  'image/jpeg': '.jpeg',
  'image/png': '.png',
  'image/tiff': '.tif',
  'video/avi': '.avi',
  'video/x-msvideo': '.avi',
  'video/mp4': '.mp4',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
};

const servedExtension = (res: Response): string | undefined =>
  EXTENSION_BY_TYPE[(res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()];

const saveAs = (filename: string | undefined, res: Response, docId: string): string => {
  const served = filenameFromResponse(res);
  if (!filename) return served || docId;

  const ours = extensionOf(filename);
  const theirs = servedExtension(res) ?? extensionOf(served);
  if (!ours || !theirs || ours === theirs) return filename;

  return filename.slice(0, -ours.length) + theirs;
};

const failureMessage = (status: number, filename: string | undefined): string => {
  const subject = filename ? `Filen "${filename}"` : 'Filen';

  if (status === 404) {
    return `${subject} saknas i arkivet. Det här är en känd lucka i digitaliseringen. Kontakta arkivet om du behöver originalet.`;
  }

  return `${subject} kunde inte hämtas (felkod ${status}).`;
};

export const downloadDocumentFile = async (docId: string, filename?: string, variant?: string): Promise<void> => {
  const query = variant ? `?variant=${variant}` : '';
  const url = apiURL(`documents/${docId}/file${query}`);

  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new DownloadError(`Nedladdningen misslyckades: ${e instanceof Error ? e.message : 'okänt fel'}.`);
  }

  if (!res.ok) {
    throw new DownloadError(failureMessage(res.status, filename), res.status);
  }

  const blobUrl = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = saveAs(filename, res, docId);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};
