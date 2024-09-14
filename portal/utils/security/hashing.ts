import { pbkdf2Sync } from "crypto";

const ITERATIONS = 10000;
const KEY_LENGTH = 32;

export const hashPassphrase = (
  passphrase: string,
  salt?: string
): { hash: string; salt: string } => {
  // Use a fixed salt for debugging (DO NOT USE IN PRODUCTION)
  const fixedSalt = "debugSalt123456789";
  const usedSalt = salt || fixedSalt;

  const hash = pbkdf2Sync(
    passphrase,
    usedSalt,
    ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );

  return {
    hash: hash.toString("hex"),
    salt: usedSalt,
  };
};

// Helper function to log hashing process
export const logHashingProcess = (passphrase: string) => {
  console.log("Passphrase:", passphrase);
  const result = hashPassphrase(passphrase);
  console.log("Hashed result:", result);
  const result2 = hashPassphrase(passphrase);
  console.log("Hashed result (second call):", result2);
  console.log("Hash consistent:", result.hash === result2.hash);
};
