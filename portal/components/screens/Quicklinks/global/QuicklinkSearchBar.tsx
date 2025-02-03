import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link as Quicklink } from '@prisma/client';
import { QuicklinksSdk } from '@/utils/services/QuicklinksSdk';
import { debounce } from '@/utils/helpers/functions';
import LinkList from '../LinkList/LinkList';

const QuicklinkSearchBar: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Quicklink[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResults]);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setLoading(true);
      const value = e.target.value;
      setQuery(value);

      try {
        const data = await QuicklinksSdk.getData(
          `/api/quicklinks/link?searchQuery=${value}`,
        );
        setResults(data.data.links);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const debouncedHandleChange = useCallback(debounce(handleChange, 500), []);

  return (
    <div ref={ref} className="relative w-full">
      <div className="relative flex w-full items-center overflow-hidden rounded-3xl border bg-white transition-all focus-within:shadow-lg">
        <div className="grid h-full w-12 place-items-center text-gray-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          className="peer h-full w-full bg-white p-[0.65rem] pr-2 text-sm text-gray-700 outline-none"
          type="text"
          id="search"
          value={query}
          onChange={(e) => {
            if (!showResults) setShowResults(true);
            if (e.target.value.length === 0) setShowResults(false);
            setQuery(e.target.value);
            debouncedHandleChange(e);
          }}
          placeholder="⚡ Search quicklinks.."
        />
      </div>

      {showResults && (
        <div className="absolute top-full z-10 mt-2 h-72 w-full overflow-y-scroll rounded-b-lg bg-white px-4 py-4 pl-2 pt-2 shadow-lg">
          {loading ? (
            Array(5)
            .fill(null)
            .map((_, index) => (
              <div
                key={index}
                className="h-10 w-full animate-pulse rounded-md bg-gray-200 mb-2 "
              ></div>
            ))
          ) : (
            query && (
              <LinkList
                inSearchBar
                allQuicklinks={results}
                isLoading={loading}
                withView="line"
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default QuicklinkSearchBar;
