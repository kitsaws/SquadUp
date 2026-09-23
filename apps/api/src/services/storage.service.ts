import fs from "fs";
import path from "path";
import { Readable } from "stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "uploads", "resumes");

// Ensure local storage directory exists for fallback
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

export class StorageService {
  private static s3Client: S3Client | null = null;
  private static bucketName: string = process.env.NEON_RESUME_BUCKET || "resumes";

  /**
   * Initializes and caches the S3Client if AWS/Neon credentials exist.
   */
  private static getClient(): S3Client | null {
    if (this.s3Client) return this.s3Client;

    const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.S3_ENDPOINT;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "auto";

    if (endpoint && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
      console.log(`[StorageService] S3 Client initialized for Neon Object Storage (Bucket: "${this.bucketName}", Endpoint: "${endpoint}").`);
      return this.s3Client;
    }

    return null;
  }

  /**
   * Checks if Neon Object Storage (S3) is configured.
   */
  static isS3Enabled(): boolean {
    return Boolean(this.getClient());
  }

  /**
   * Uploads a resume PDF to Neon Object Storage (or local disk fallback).
   * Returns a persistent URI/path identifier (e.g., "s3://resumes/user_123.pdf").
   */
  static async uploadResumePdf(
    userId: string,
    fileBuffer: Buffer,
    originalFilename: string
  ): Promise<string> {
    const s3 = this.getClient();
    const objectKey = `${userId}.pdf`;

    if (s3) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: objectKey,
            Body: fileBuffer,
            ContentType: "application/pdf",
            Metadata: {
              originalFilename: encodeURIComponent(originalFilename),
              userId,
            },
          })
        );
        console.log(`[StorageService] Uploaded resume to Neon S3: s3://${this.bucketName}/${objectKey}`);
        return `s3://${this.bucketName}/${objectKey}`;
      } catch (err) {
        console.error("[StorageService] S3 upload failed, falling back to local disk:", err);
      }
    }

    // Local Disk Fallback
    const localFilePath = path.join(LOCAL_STORAGE_DIR, `${userId}.pdf`);
    await fs.promises.writeFile(localFilePath, fileBuffer);
    console.log(`[StorageService] Saved resume to local disk: ${localFilePath}`);
    return localFilePath;
  }

  /**
   * Retrieves a readable stream for a resume PDF from S3 or local disk.
   */
  static async getResumePdfStream(
    filePathOrUri: string
  ): Promise<{ stream: NodeJS.ReadableStream; contentLength?: number } | null> {
    if (!filePathOrUri) return null;

    // Check if it is an S3 URI
    if (filePathOrUri.startsWith("s3://")) {
      const s3 = this.getClient();
      if (!s3) {
        console.warn("[StorageService] S3 client not configured but URI is S3:", filePathOrUri);
        return null;
      }

      // Parse s3://bucket/key
      const withoutPrefix = filePathOrUri.slice(5);
      const firstSlashIdx = withoutPrefix.indexOf("/");
      const bucket = firstSlashIdx !== -1 ? withoutPrefix.slice(0, firstSlashIdx) : this.bucketName;
      const key = firstSlashIdx !== -1 ? withoutPrefix.slice(firstSlashIdx + 1) : withoutPrefix;

      try {
        const res = await s3.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );

        if (res.Body) {
          return {
            stream: res.Body as Readable,
            contentLength: res.ContentLength,
          };
        }
      } catch (err: any) {
        console.error(`[StorageService] Error reading from S3 (${filePathOrUri}):`, err.message);
        return null;
      }
    }

    // Check local filesystem
    if (fs.existsSync(filePathOrUri)) {
      const stat = await fs.promises.stat(filePathOrUri);
      return {
        stream: fs.createReadStream(filePathOrUri),
        contentLength: stat.size,
      };
    }

    return null;
  }

  /**
   * Deletes a resume PDF from S3 or local disk.
   */
  static async deleteResumePdf(filePathOrUri: string): Promise<void> {
    if (!filePathOrUri) return;

    if (filePathOrUri.startsWith("s3://")) {
      const s3 = this.getClient();
      if (!s3) return;

      const withoutPrefix = filePathOrUri.slice(5);
      const firstSlashIdx = withoutPrefix.indexOf("/");
      const bucket = firstSlashIdx !== -1 ? withoutPrefix.slice(0, firstSlashIdx) : this.bucketName;
      const key = firstSlashIdx !== -1 ? withoutPrefix.slice(firstSlashIdx + 1) : withoutPrefix;

      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
      } catch (err) {
        console.warn(`[StorageService] Failed to delete from S3 (${filePathOrUri}):`, err);
      }
      return;
    }

    if (fs.existsSync(filePathOrUri)) {
      try {
        await fs.promises.unlink(filePathOrUri);
      } catch (err) {
        console.warn(`[StorageService] Failed to delete local file (${filePathOrUri}):`, err);
      }
    }
  }
}
