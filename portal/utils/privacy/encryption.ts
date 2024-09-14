import CryptoJS from "crypto-js";

// Use a fixed IV for debugging (DO NOT USE IN PRODUCTION)
const fixedIV = CryptoJS.enc.Utf8.parse("1234567890123456");

export function encryptData(plainText: string, secret: string): string {
  const key = CryptoJS.enc.Utf8.parse(secret);
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv: fixedIV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString();
}

export function decryptData(cipherText: string, secret: string): string {
  const key = CryptoJS.enc.Utf8.parse(secret);
  const decrypted = CryptoJS.AES.decrypt(cipherText, key, {
    iv: fixedIV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

// Helper function to log encryption/decryption process
export function logEncryptionProcess(plainText: string, secret: string) {
  console.log("Plain text:", plainText);
  console.log("Secret:", secret);
  const encrypted = encryptData(plainText, secret);
  console.log("Encrypted:", encrypted);
  const decrypted = decryptData(encrypted, secret);
  console.log("Decrypted:", decrypted);
  console.log("Decryption successful:", plainText === decrypted);
}
