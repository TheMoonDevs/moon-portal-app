export const isValidEthAddress = (address: string) => {
  const addressPattern = new RegExp("^(0x)?[0-9a-fA-F]{40}$", "i");
  return !!addressPattern.test(address);
};
