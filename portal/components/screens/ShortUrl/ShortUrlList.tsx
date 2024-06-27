import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";
import { setAllLinks } from "@/utils/redux/shortUrl/shortUrl.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setError, setLoading, setSuccess } from "@/utils/redux/ui/ui.slice";
import { ShortUrlSdk } from "@/utils/services/ShortUrlSdk";
import { CircularProgress, Tooltip } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";

export const ShortUrlList = () => {
  const { isLoading, error, success } = useAppSelector((state) => state.ui);
  const { allLinks } = useAppSelector((state) => state.shortUrl);
  const { copyToClipboard, copied } = useCopyToClipboard();
  const [activeCopyIndex, setActiveCopyIndex] = useState<null | number>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<null | string>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const dispatch = useAppDispatch();

  const handleCopy = (index: number) => {
    copyToClipboard(
      `${process.env.NEXT_PUBLIC_SHORT_LINK_BASE_URL}/l/${allLinks[index].slug}`
    );
    setActiveCopyIndex(index);
  };

  const handleDelete = async (id: string) => {
    dispatch(setLoading(true));
    setActiveDeleteId(id);

    try {
      const response = await ShortUrlSdk.deleteShortUrl(
        "/api/short-url/delete-link",
        id
      );
      if (response) {
        const updatedData = allLinks.filter((item) => item.id !== id);
        dispatch(setAllLinks(updatedData));
        dispatch(setLoading(false));
      }
    } catch (error: any) {
      dispatch(setLoading(false));
      dispatch(setError({ isError: true, description: error.message }));
      console.error(error);
    }
  };

  useEffect(() => {
    dispatch(setLoading(true));
    const getAllLinks = async () => {
      try {
        const response = await ShortUrlSdk.getAllShortUrls(
          "/api/short-url/get-all-links"
        );
        dispatch(setAllLinks(response));
        dispatch(setLoading(false));
        dispatch(setSuccess(true));
      } catch (error: any) {
        dispatch(setLoading(false));
        dispatch(setSuccess(false));
        dispatch(setError({ isError: true, description: error.message }));
        console.error(error);
      }
    };

    getAllLinks();
  }, [dispatch]);

  return (
    <div className="w-max flex items-center justify-center rounded-lg min-h-full h-full overflow-y-auto bg-white ">
      {success ? (
        <table className="w-full space-y-2 overflow-y-auto ">
          <thead className="border-b border-gray-400 rounded-l-2xl ">
            <tr className="text-left bg-gray-200 ">
              <th className="p-4">Short Link</th>
              <th className="p-4">Redirects to</th>
              <th className="p-4">Created At</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className=" ">
            {allLinks.map((link, index) => {
              const isCopied = copied && activeCopyIndex === index;

              return (
                <React.Fragment key={link.id}>
                  <tr className="bg-slate-100 hover:bg-slate-200 rounded-l-lg rounded-r-lg py-4">
                    <td className="px-2 py-3 flex flex-col gap-4 cursor-default">
                      <span ref={textRef} className="font-medium">
                        {process.env.NEXT_PUBLIC_SHORT_LINK_BASE_URL}/l/
                        {link.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-[875px] cursor-default font-medium">
                      <span className="line-clamp-2">{link.redirectTo}</span>
                    </td>
                    <td className="px-4 py-3 cursor-default font-medium">
                      {new Date(link?.createdAt).toDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Tooltip title={isCopied ? "Copied!" : "Copy"}>
                          {isCopied ? (
                            <span className="material-icons-outlined !text-xl cursor-pointer">
                              check
                            </span>
                          ) : (
                            <span
                              className="material-icons-outlined !text-xl cursor-pointer"
                              onClick={() => handleCopy(index)}
                            >
                              content_copy
                            </span>
                          )}
                        </Tooltip>
                        <Tooltip title={"Delete"}>
                          {isLoading && activeDeleteId === link.id ? (
                            <span>Deleting...</span>
                          ) : (
                            <span
                              className="material-icons-outlined !text-2xl hover:text-red-500 cursor-pointer"
                              onClick={() => handleDelete(link.id)}
                            >
                              delete
                            </span>
                          )}
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                  <tr className="h-2 bg-transparent"></tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      ) : isLoading ? (
        <div className="animate-pulse w-screen px-56 ">
          <div className="  flex items-center justify-around space-x-4 bg-gray-300 py-4 rounded-md ">
            <div className="w-24 h-5 bg-gray-500 rounded"></div>
            <div className="w-24 h-5 bg-gray-500 rounded"></div>
            <div className="w-24 h-5 bg-gray-500 rounded"></div>
            <div className="w-24 h-5 bg-gray-500 rounded"></div>
          </div>

          <ul className="mt-2 space-y-2">
            <li className="h-10 rounded bg-neutral-500/70 w-full flex items-center justify-around ">
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
            </li>
            <li className="h-10 rounded bg-neutral-500/70 w-full flex items-center justify-around ">
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
            </li>
            <li className="h-10 rounded bg-neutral-500/70 w-full flex items-center justify-around ">
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
            </li>
            <li className="h-10 rounded bg-neutral-500/70 w-full flex items-center justify-around ">
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
            </li>
            <li className="h-10 rounded bg-neutral-500/70 w-full flex items-center justify-around ">
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
              <div className="w-36 h-4 bg-gray-300 rounded"></div>
            </li>
          </ul>
        </div>
      ) : error.isError ? (
        <div>Error: {error.description}</div>
      ) : null}
    </div>
  );
};
