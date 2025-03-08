import { HomePage } from '@/components/Pages/HomePage/HomePage';
import fs from 'node:fs/promises';
import { getPlaiceholder } from 'plaiceholder';
import { Suspense } from 'react';

export default async function Home() {
  const src = '/images/hero.webp';

  const buffer = await fs.readFile(`./public${src}`);

  const { base64 } = await getPlaiceholder(buffer);
  return (
    <HomePage base64Placeholder={base64} />
  );
}
