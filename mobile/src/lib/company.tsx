import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api } from './api';
import { useAuth } from './auth';
import { KEYS, read, write } from './secure';
import type { Company, Workspace } from './types';

type CompanyValue = {
  companies: Company[];
  company: Company | null;
  setCompanyId: (id: string) => void;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

const CompanyContext = createContext<CompanyValue | null>(null);

/**
 * The person's companies (as on the website's home tabs) and the one the
 * app is showing. The choice is remembered on the phone.
 */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [savedId, setSavedId] = useState<string | null>(null);

  // Read again on each sign-in; an id from someone else's sign-in matches no
  // company and falls back to the first.
  useEffect(() => {
    if (status === 'signedIn') void read(KEYS.companyId).then(setSavedId);
  }, [status]);

  const query = useQuery({
    queryKey: ['workspace'],
    queryFn: () => api<Workspace>('/api/workspace'),
    enabled: status === 'signedIn',
  });

  // Personal last, like the website.
  const companies = useMemo(
    () =>
      (query.data?.companies ?? [])
        .map((c) => c.company)
        .sort((a, b) => Number(!!a.isPersonal) - Number(!!b.isPersonal)),
    [query.data],
  );
  const company = companies.find((c) => c.id === savedId) ?? companies[0] ?? null;

  const setCompanyId = useCallback((id: string) => {
    setSavedId(id);
    void write(KEYS.companyId, id);
  }, []);

  const { refetch } = query;
  const value = useMemo(
    () => ({
      companies,
      company,
      setCompanyId,
      loading: query.isPending && status === 'signedIn',
      error: query.error,
      refetch: () => void refetch(),
    }),
    [companies, company, setCompanyId, query.isPending, query.error, refetch, status],
  );
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const value = useContext(CompanyContext);
  if (!value) throw new Error('useCompany must be used inside CompanyProvider');
  return value;
}
