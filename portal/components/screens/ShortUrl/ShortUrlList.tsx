import TableLoader from "@/components/elements/TableLoader";
import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";
import { setAllLinks } from "@/utils/redux/shortUrl/shortUrl.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setError, setLoading, setSuccess } from "@/utils/redux/ui/ui.slice";
import { ShortUrlSdk } from "@/utils/services/ShortUrlSdk";
import { CircularProgress, Tooltip, TextField } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";

export const ShortUrlList = () => {
  const { isLoading, error, success } = useAppSelector((state) => state.ui);
  const { allLinks } = useAppSelector((state) => state.shortUrl);
  const { copyToClipboard, copied } = useCopyToClipboard();
  const [activeCopyIndex, setActiveCopyIndex] = useState<null | number>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<null | string>(null);
  const [searchQuery, setSearchQuery] = useState(""); // Search query state
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

  const filteredLinks = allLinks.filter((link) =>
    link.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.redirectTo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-11/12 flex flex-col rounded-lg min-h-full h-full overflow-y-auto bg-white">
      <div className="sticky top-0 bg-white z-10 p-4 shadow">
        <TextField
          label="Search Links"
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {success ? (
        <table className="w-full space-y-2 overflow-y-auto">
          <thead className="border-b border-gray-400">
            <tr className="text-left bg-gray-200">
              <th className="p-4">Short Links</th>
            </tr>
          </thead>
          <tbody>
            {filteredLinks.map((link, index) => {
              const isCopied = copied && activeCopyIndex === index;
              return (
                <React.Fragment key={link.id}>
                  <tr className="bg-slate-100 hover:bg-slate-200 rounded-l-lg rounded-r-lg py-4">
                    <td className="px-4 py-3 flex flex-col gap-2 cursor-default">
                      <div className="flex items-center justify-between">
                        <Tooltip title={`${process.env.NEXT_PUBLIC_SHORT_LINK_BASE_URL}/l/${link.slug}`}>
                          <a
                            href={`${process.env.NEXT_PUBLIC_SHORT_LINK_BASE_URL}/l/${link.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-blue-600 hover:text-blue-800"
                          >
                            {process.env.NEXT_PUBLIC_SHORT_LINK_BASE_URL}/l/{link.slug}
                          </a>
                        </Tooltip>
                        <div className="flex gap-4">
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
                          <Tooltip title="Delete">
                            {isLoading && activeDeleteId === link.id ? (
                              <CircularProgress size={24} />
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
                      </div>
                      <span className="text-gray-500 text-sm">
                        {new Date(link?.createdAt).toDateString()}
                      </span>
                      <div className="mt-3">
                        <Tooltip title={link.redirectTo}>
                          <a
                            href={link.redirectTo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-black hover:text-white"
                          >
                            {link.redirectTo.length > 20
                              ? `${link.redirectTo.slice(0, 20)}...`
                              : link.redirectTo}
                          </a>
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
        <TableLoader />
      ) : error.isError ? (
        <div>Error: {error.description}</div>
      ) : null}
    </div>
  );
};
