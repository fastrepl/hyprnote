import { Upload } from "tus-js-client";

const BUCKET_NAME = "audio-files";
const CHUNK_SIZE = 6 * 1024 * 1024;
const RETRY_DELAYS = [0, 3000, 5000, 10000, 20000];

export function uploadAudio(options: {
  file: File | Blob;
  fileName: string;
  contentType: string;
  supabaseUrl: string;
  accessToken: string;
  userId: string;
  onProgress?: (percentage: number) => void;
}): { promise: Promise<string>; abort: () => void } {
  const fileId = `${options.userId}/${Date.now()}-${options.fileName}`;
  const projectId = new URL(options.supabaseUrl).hostname.split(".")[0];
  const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;

  let upload: Upload | null = null;

  const promise = new Promise<string>((resolve, reject) => {
    upload = new Upload(options.file, {
      endpoint,
      retryDelays: RETRY_DELAYS,
      headers: {
        authorization: `Bearer ${options.accessToken}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET_NAME,
        objectName: fileId,
        contentType: options.contentType,
        cacheControl: "3600",
      },
      chunkSize: CHUNK_SIZE,
      onError: (error) => {
        reject(error);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        if (options.onProgress && bytesTotal > 0) {
          options.onProgress((bytesUploaded / bytesTotal) * 100);
        }
      },
      onSuccess: () => {
        resolve(fileId);
      },
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload!.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload!.start();
    });
  });

  return {
    promise,
    abort: () => {
      upload?.abort();
    },
  };
}
