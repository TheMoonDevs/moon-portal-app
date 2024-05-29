"use client";
import { setSearchTerm } from "@/utils/redux/searchTerm/search.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import React from "react";

const Searchbar = () => {
  const searchTerm = useAppSelector((state) => state.searchTerm.term);
  const dispatch = useAppDispatch();

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchTerm(e.target.value));
  };
  return (
    <form className="flex max-w-xl mx-3">
      <label htmlFor="simple-search" className="sr-only">
        Search
      </label>
      <div className="relative w-full">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
        </div>
        <input
          type="text"
          id="simple-search"
          className="bg-gray-50 border border-gray-400  text-sm rounded-lg  w-full ps-10 p-2.5    "
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
