import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { hashPassphrase, verifyPassphrase } from "./hashing";

const IV_LENGTH = 12;

export function encryptData(data: string, key: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptData(encryptedData: string, key: string): string {
  const data = Buffer.from(encryptedData, "base64");
  const iv = data.slice(0, IV_LENGTH);
  const tag = data.slice(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = data.slice(IV_LENGTH + 16);
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

async function verifyWithBackend(hash: string, salt: string) {
  // Implement backend verification logic here
  // This should send the hash and salt to the backend for verification
  // Return true if verified, false otherwise
}
