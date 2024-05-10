import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const config = {
  s3Client: new S3({
    forcePathStyle: false,
    endpoint: process.env.SPACES_ENDPOINT,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.SPACES_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.SPACES_SECRET_KEY || "",
    },
  }),
  bucket: process.env.SPACES_NAME || "",
  folder: "files",
};

export const fileUploadSdk = {
  /**
   * Uploads a file to the specified bucket on digital ocean.
   *
   * @param {Object} params - The parameters for the file upload.
   * @param {any} params.file - The file to be uploaded.
   * @param {string} params.userId - The ID of the user uploading the file.
   * @param {string} params.folder - The folder where the file will be stored.
   * @return {Promise<Object>} A promise that resolves to the response from the S3 upload request.
   */
  uploadFile: async ({
    file,
    userId,
    folder,
  }: {
    file: any;
    userId?: string;
    folder?: string;
  }): Promise<PutObjectCommandOutput | undefined> => {
    let key;
    if (!userId) key = file.name;
    else key = `${folder || config.folder}/${userId}/${file.name}`;
    try {
      const Body = await file.arrayBuffer();
      const res = await config.s3Client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: Buffer.from(Body),
          ACL: "public-read",
          ContentEncoding: "base64",
          ContentType: file.type,
          BucketKeyEnabled: true,
          Metadata: {
            name: file.name,
            type: file.type,
          },
        })
      );
      return res;
    } catch (error) {
      console.log(error);
    }
  },

  getPublicFileUrl: ({
    userId,
    file,
  }: {
    userId?: string;
    file: any;
  }): string => {
    return userId
      ? ` https://${
          process.env.SPACES_NAME
        }.nyc3.cdn.digitaloceanspaces.com/files/${userId}/${encodeURI(
          file.name
        )}`
      : `https://${
          process.env.SPACES_NAME
        }.nyc3.cdn.digitaloceanspaces.com/files/${encodeURI(file.name)}`;
  },
  /**
   * Retrieves the private signed URL good for 24 hrs of the file associated with the provided key.
   *
   * @param {string} key - The key used to identify the file.
   * @return {Promise<string | undefined>} The URL of the file if found, otherwise undefined.
   */

  getPrivateFileUrl: async ({
    userId,
    file,
    folder,
  }: {
    userId?: string;
    file: any;
    folder?: string;
  }): Promise<string | undefined> => {
    let key;
    if (!userId) key = file.name;
    else key = `${folder || config.folder}/${userId}/${file.name}`;
    try {
      const url = await getSignedUrl(
        config.s3Client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: 3600 * 24 }
      );
      return url;
    } catch (error) {
      console.log(error);
    }
  },

  /**
   * Deletes a file from the specified bucket on digital ocean.
   *
   * @param {Object} params - The parameters for the file deletion.
   * @param {string} params.userId - The ID of the user who owns the file.
   * @param {string} params.fileName - The name of the file to be deleted.
   * @return {Promise<Object>} A promise that resolves to the response from the S3 delete request.
   */

  deleteFile: async ({
    userId,
    fileName,
    folder,
  }: {
    fileName: string;
    userId?: string;
    folder?: string;
  }): Promise<DeleteObjectCommandOutput | undefined> => {
    let key;
    if (!userId) key = fileName;
    else key = `${folder || config.folder}/${userId}/${fileName}`;
    try {
      const res = await config.s3Client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        })
      );
      return res;
    } catch (error) {
      console.log(error);
    }
  },
};
