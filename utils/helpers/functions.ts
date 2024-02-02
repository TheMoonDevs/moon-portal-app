export function generateSlug(length: number): string {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    slug += charset[randomIndex];
  }

  return slug;
}
