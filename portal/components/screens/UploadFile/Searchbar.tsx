'use client';
import React from 'react';

import { setSearchTerm } from '@/utils/redux/searchTerm/search.slice';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';

const Searchbar = () => {
  const searchTerm = useAppSelector((state) => state.searchTerm.term);
  const dispatch = useAppDispatch();

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchTerm(e.target.value));
  };
  return (
    <form className="mx-3 flex max-w-xl">
      <label htmlFor="simple-search" className="sr-only">
        Search
      </label>
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
          <svg
            className="size-4 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
        </div>
        <input
          type="text"
          id="simple-search"
          className="w-full rounded-lg border border-gray-400 bg-gray-50 p-2.5 ps-10 text-sm"
          placeholder="Search files..."
          value={searchTerm}
          required
          onChange={handleSearchInputChange}
        />
      </div>
    </form>
  );
};

export default Searchbar;
