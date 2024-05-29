import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";
import { setAllLinks } from "@/utils/redux/shortUrl/shortUrl.slice";
import { useAppDispatch, useAppSelector } from "@/utils/redux/store";
import { setError, setLoading, setSuccess } from "@/utils/redux/ui/ui.slice";
import { ShortUrlSdk } from "@/utils/services/ShortUrlSdk";
import { CircularProgress, Tooltip } from "@mui/material";
import { useEffect, useRef, useState } from "react";

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
    <div className="w-full flex bg-white rounded-lg shadow-md p-4 h-80 overflow-auto">
      {success ? (
        <table>
          <thead className="border-b border-gray-200 bg-gray-200 ">
            <tr className="text-left ">
              <th className="px-4 py-2">Short Link</th>
              <th className="px-4 py-2">Redirects to</th>
              <th className="px-4 py-2">Created At</th>
            </tr>
          </thead>
          <tbody>
            {allLinks.map((link, index) => {
              const isCopied = copied && activeCopyIndex === index;

              return (
                <tr key={link.id} className="border-b border-gray-200">
                  <td className="px-2 py-2 flex flex-col gap-4">
                    <span ref={textRef}>
                      {process.env.NEXT_PUBLIC_SHORT_LINK_BASE_URL}/l/
                      {link.slug}
                    </span>
                    <div className="flex gap-2">
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
                            className="material-icons-outlined !text-xl cursor-pointer"
                            onClick={() => handleDelete(link.id)}
                          >
                            delete
                          </span>
                        )}
                      </Tooltip>
                    </div>
                  </td>
                  <td className="px-4 py-2">{link.redirectTo}</td>
                  <td className="px-4 py-2">
                    {new Date(link?.createdAt).toDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : isLoading ? (
        <div className="flex justify-center items-center w-full">
          <CircularProgress color="inherit" />
        </div>
      ) : error.isError ? (
        <div>Error: {error.description}</div>
      ) : null}
    </div>
  );
};
