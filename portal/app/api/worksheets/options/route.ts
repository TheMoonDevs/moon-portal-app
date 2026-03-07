import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCountryOptions,
  fetchTimezoneOptions,
} from '@/lib/worksheets/actions-lib/global-options';

export async function fetchCompanyOptions(query: string) {
  // Simulate fetching options from a DB or API
  await new Promise(resolve => setTimeout(resolve, 500));
  const companies = ["Apple", "Google", "Microsoft", "Amazon", "Facebook", "Tesla", "Netflix"];
  return companies
    .filter(c => c.toLowerCase().includes(query.toLowerCase()))
    .map(c => ({ label: c, value: c }));
}

const OPTIONS_HANDLERS: Record<
  string,
  (query: string) => Promise<{ label: string; value: string | number }[]>
> = {
  company: fetchCompanyOptions,
  country: fetchCountryOptions,
  timezone: fetchTimezoneOptions,
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') ?? '';
    const query = url.searchParams.get('query') ?? '';

    const handler = OPTIONS_HANDLERS[type];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown options type: ${type}` },
        { status: 400 }
      );
    }

    const options = await handler(query);
    return NextResponse.json({ options });
  } catch (e) {
    console.error('Options fetch error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch options' },
      { status: 500 }
    );
  }
}
