import { pbkdf2Sync, randomBytes } from "crypto";

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export const hashPassphrase = (
  passphrase: string,
  salt?: Buffer
): { hash: string; salt: string } => {
  const usedSalt = salt || randomBytes(SALT_LENGTH);
  const hash = pbkdf2Sync(
    passphrase,
    usedSalt,
    ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );
  return {
    hash: hash.toString("hex"),
    salt: usedSalt.toString("hex"),
  };
};

export const verifyPassphrase = (
  passphrase: string,
  hash: string,
  salt: string
): boolean => {
  const { hash: newHash } = hashPassphrase(
    passphrase,
    Buffer.from(salt, "hex")
  );
  return newHash === hash;
};
