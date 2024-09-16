import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link as Quicklink } from "@prisma/client";
import { QuicklinksSdk } from "@/utils/services/QuicklinksSdk";
import { debounce } from "@/utils/helpers/functions";
import LinkList from "../LinkList/LinkList";

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
    <div ref={ref} className="relative">
      <div className="relative flex items-center w-full rounded-3xl focus-within:shadow-lg bg-white overflow-hidden  transition-all border ">
        <div className="grid place-items-center h-full w-12 text-gray-300">
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
          className="peer h-full w-full outline-none text-sm text-gray-700 pr-2 p-[0.65rem] bg-white"
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
      {/* <div className="relative">
        <span className="material-symbols-outlined absolute -left-4 text-neutral-300">
          search
        </span>
        <input className="border-b border-b-gray-300 focus:border-b-gray-500  w-full outline-none transition-all bg-white"></input>
      </div> */}
      {showResults && (
        <div className="absolute h-72 z-10 w-64 bg-white overflow-y-scroll shadow-lg px-4 pl-2 mt-4 rounded-b-lg  py-4 pt-2 overflow-x-hidden">
          {loading ? (
            <p>Loading...</p>
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
