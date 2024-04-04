import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link as Quicklink } from "@prisma/client";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { debounce } from "@/utils/helpers/functions";
import LinkList from "../LinkList/LinkList";
import { APP_BASE_URL } from "@/utils/constants/appInfo";

const QuicklinkSearchBar: React.FC = () => {
  const [query, setQuery] = useState<string>("");
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showResults]);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setLoading(true);
      const value = e.target.value;
      setQuery(value);

      try {
        const data = await QuicklinksSdk.getData(
          `/api/quicklinks/link?searchQuery=${value}`
        );
        setResults(data.data.links);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedHandleChange = useCallback(debounce(handleChange, 500), []);

  return (
    <div ref={ref} className="relative mr-8 ">
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onFocus={() => setShowResults(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          debouncedHandleChange(e);
        }}
        className="border-b border-b-gray-300 focus:border-b-gray-500 p-2 w-full outline-none transition-all"
      />
      {showResults && (
        <div className="absolute h-96 z-10 w-64 bg-white overflow-y-scroll shadow-md px-4 ">
          {loading ? (
            <p>Loading...</p>
          ) : (
            query && (
              <LinkList
                allQuicklinks={results}
                isLoading={loading}
                withView="list"
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default QuicklinkSearchBar;
