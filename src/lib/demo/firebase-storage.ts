/**
 * @fileOverview `firebase/storage` replacement for the offline demo.
 *
 * Uploaded files are kept in memory and exposed as data URLs so photo previews
 * and ID cards work without any cloud bucket.
 */

const files = new Map<string, string>();

const demoStorage = {
  __demo: true,
  app: { name: '[DEMO]' },
  maxOperationRetryTime: 120000,
  maxUploadRetryTime: 600000,
};

export function getStorage(_app?: any, _bucketUrl?: string): any {
  return demoStorage;
}

export class DemoStorageReference {
  readonly bucket = 'shule-altra-demo.appspot.com';
  readonly fullPath: string;
  constructor(public path: string) {
    this.fullPath = path;
  }
  get name(): string {
    const parts = this.path.split('/');
    return parts[parts.length - 1];
  }
  get parent(): DemoStorageReference | null {
    const parts = this.path.split('/');
    if (parts.length < 2) return null;
    return new DemoStorageReference(parts.slice(0, -1).join('/'));
  }
  child(path: string): DemoStorageReference {
    return new DemoStorageReference(`${this.path}/${path}`.replace(/\/+/g, '/'));
  }
  toString(): string {
    return `gs://${this.bucket}/${this.path}`;
  }
}

export function ref(storageOrRef: any, path?: string): DemoStorageReference {
  if (storageOrRef instanceof DemoStorageReference && !path) return storageOrRef;
  const base = storageOrRef instanceof DemoStorageReference ? storageOrRef.path : '';
  return new DemoStorageReference(`${base}/${path || ''}`.replace(/\/+/g, '/').replace(/^\//, ''));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader === 'undefined') {
    return Promise.resolve(
      `data:image/svg+xml;utf8,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#1F5BA6"/><text x="100" y="105" font-size="60" fill="white" text-anchor="middle" font-family="sans-serif">SA</text></svg>'
      )}`
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function uploadBytes(
  storageRef: DemoStorageReference,
  data: Blob | Uint8Array | ArrayBuffer,
  _metadata?: Record<string, any>
): Promise<{ ref: DemoStorageReference; metadata: Record<string, any> }> {
  let dataUrl: string;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    dataUrl = await blobToDataUrl(data);
  } else {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
    dataUrl = `data:application/octet-stream;base64,${btoa(String.fromCharCode(...Array.from(bytes)))}`;
  }
  files.set(storageRef.path, dataUrl);
  return { ref: storageRef, metadata: { contentType: 'image/jpeg', size: dataUrl.length } };
}

export async function uploadString(
  storageRef: DemoStorageReference,
  value: string,
  format?: 'raw' | 'base64' | 'base64url' | 'data_url'
): Promise<{ ref: DemoStorageReference; metadata: Record<string, any> }> {
  const dataUrl =
    format === 'data_url' ? value : `data:application/octet-stream;base64,${format === 'base64' ? value : btoa(value)}`;
  files.set(storageRef.path, dataUrl);
  return { ref: storageRef, metadata: { size: dataUrl.length } };
}

export async function getDownloadURL(storageRef: DemoStorageReference): Promise<string> {
  const existing = files.get(storageRef.path);
  if (existing) return existing;
  const initials = (storageRef.path.match(/[A-Za-z0-9]/g) || ['S', 'A']).slice(0, 2).join('').toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1F5BA6"/><stop offset="100%" stop-color="#945CE6"/></linearGradient></defs><rect width="240" height="240" rx="24" fill="url(#g)"/><text x="120" y="140" font-size="88" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">${initials}</text></svg>`
  )}`;
}

export async function deleteObject(storageRef: DemoStorageReference): Promise<void> {
  files.delete(storageRef.path);
}

export const FirebaseStorage: any = undefined;
export const StorageReference: any = undefined;
export const UploadResult: any = undefined;
