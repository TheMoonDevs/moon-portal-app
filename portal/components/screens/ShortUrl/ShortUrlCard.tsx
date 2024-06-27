import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, CircularProgress, TextField } from "@mui/material";

import useAsyncState from "@/utils/hooks/useAsyncState";
import useCopyToClipboard from "@/utils/hooks/useCopyToClipboard";
import { generateSlug } from "@/utils/helpers/functions";
import { ShortUrlSdk } from "@/utils/services/ShortUrlSdk";
import { addLink } from "@/utils/redux/shortUrl/shortUrl.slice";
import { useAppDispatch } from "@/utils/redux/store";
export const ShortUrlCard = () => {
  const [newLinkButtonClicked, setNewLinkButtonClicked] = useState(false);
  const [formData, setFormData] = useState({ slug: "", url: "" });
  const textRef = useRef<HTMLSpanElement | null>(null);

  const dispatch = useAppDispatch();

  const { loading, error, success, setLoading, setSuccess, setError } =
    useAsyncState();
  const { copyToClipboard, copied } = useCopyToClipboard();

  const handleCopy = () => {
    if (textRef.current) {
      copyToClipboard(textRef.current.innerText);
    }
  };

  const processSearchParams = useCallback(
    (
      url: string
    ):
      | Array<{
          event_id?: string;
          url_fieldname?: string;
          url_value?: string;
        }>
      | [] => {
      const searchParams = new URLSearchParams(new URL(url).search);
      let params: {
        event_id?: string;
        url_fieldname?: string;
        url_value?: string;
      }[] = [];

      if (searchParams.size !== 0) {
        let firstElement: { key: string; value: string } = {
          key: "",
          value: "",
        };

        searchParams.forEach((value, key) => {
          if (firstElement.key === "" && firstElement.value === "") {
            firstElement = { key, value };
          }
        });

        params.push({
          event_id: firstElement.key,
          url_fieldname: firstElement.key,
          url_value: firstElement.value,
        });
      } else {
        params = [];
      }
      return params;
    },
    []
  );

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { url, slug } = formData;
    const params = processSearchParams(url);

    try {
      if (!slug.match("^[-a-zA-Z0-9]+$")) {
        throw new Error(
          `Invalid slug! Only alphanumeric characters and hyphens are allowed. No spaces.`
        );
      }

      const response = await ShortUrlSdk.createShortUrl(
        "/api/short-url/create-link",
        { url, slug, params }
      );

      const link = JSON.parse(response);

      dispatch(addLink(link));

      setLoading(false);
      setSuccess(true);
    } catch (error: any) {
      setLoading(false);
      setSuccess(false);
      setError({ isError: true, description: error?.message || error });
      console.error(error);
    }
  };

  if (success && !newLinkButtonClicked) {
    return (
      <div className="flex flex-col gap-4 justify-center items-center">
        <div className="flex flex-col gap-4 justify-center items-center shadow-md p-6">
          <span className="material-icons-outlined !text-6xl">task_alt</span>
          <h1 className="text-3xl md:text-4xl font-bold">
            Here is your short link!
          </h1>
          <div className="flex gap-6 items-center mt-6">
            <span
              className="text-gray-600 text-center md:pl-3 font-normal"
              ref={textRef}
            >
              {process.env.NEXT_PUBLIC_SHORT_LINK_BASE_URL}/l/{formData.slug}
            </span>
            <Button
              startIcon={
                copied ? (
                  <span className="material-icons-outlined">check</span>
                ) : (
                  <span className="material-icons-outlined">content_copy</span>
                )
              }
              variant="outlined"
              className={` ${
                copied
                  ? "!bg-green-500 !border-none !text-white"
                  : "!border-black !text-black"
              }`}
              onClick={handleCopy}
            >
              Copy
            </Button>
          </div>
          <Button
            variant="contained"
            className="!bg-stone-800 !text-white w-full !mt-8"
            onClick={() => setNewLinkButtonClicked(true)}
          >
            Create New
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-md shadow-md ">
      <h2 className="text-2xl font-bold text-center text-gray-800  mb-4">
        URL Shortener
      </h2>
      {error ? (
        <div className="">
          <span className="text-red-500 text-sm">{error.description}</span>
        </div>
      ) : null}
      <form className="grid gap-6 mt-5" onSubmit={handleFormSubmit}>
        <div className="flex items-stretch space-x-2  ">
          {/* <TextField
            inputProps={{
              pattern: "^[-a-zA-Z0-9]+$",
              sx: { padding: "10px " }, // Adjust the padding as needed
            }}
            className="flex-1 h-full "
            name="slug placeholder:pb-2 "
            value={formData.slug}
            id="slug"
            placeholder="5g3th9"
            type="text"
            label="Slug"
            onChange={(e) => {
              if (error.isError) setError({ isError: false, description: "" });
              setFormData({ ...formData, slug: e.target.value });
            }}
            required
          /> */}
          <TextField
            inputProps={{
              pattern: "^[-a-zA-Z0-9]+$",
              sx: { padding: "10px" }, // Adjust the padding as needed
            }}
            InputLabelProps={{
              sx: {
                transform: "translate(10px, 12px) scale(1)", // Adjust this as needed
                "&.MuiInputLabel-shrink": {
                  transform: "translate(13.5px, -5.5px) scale(0.75)", // Adjust this as needed
                },
              },
            }}
            className="flex-1 h-full"
            name="slug"
            value={formData.slug}
            id="slug"
            placeholder="5g3th9"
            type="text"
            label="Slug"
            onChange={(e) => {
              if (error.isError) setError({ isError: false, description: "" });
              setFormData({ ...formData, slug: e.target.value });
            }}
            required
          />
          <Button
            variant="contained"
            className="!bg-stone-800 !text-white"
            type="button"
            onClick={() => {
              const randomSlug: string = generateSlug(5);
              setFormData({ ...formData, slug: randomSlug });
            }}
          >
            Generate
          </Button>
        </div>
        <div className="space-y-2">
          <TextField
            inputProps={{
              sx: { padding: "10px" }, // Adjust the padding as needed
            }}
            InputLabelProps={{
              sx: {
                transform: "translate(10px, 12px) scale(1)", // Adjust this as needed
                "&.MuiInputLabel-shrink": {
                  transform: "translate(13.5px, -5.5px) scale(0.75)", // Adjust this as needed
                },
              },
            }}
            id="url"
            name="url"
            placeholder="https://themoondevs.com?strategy=lin-gtm&campaign_id=lin-gtm-1&linkedin-referrer=subhakar"
            className="w-full"
            type="url"
            label="Redirect URL"
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            required
          />
        </div>
        <Button
          variant="contained"
          className="!bg-stone-800 !text-white flex gap-3"
          type="submit"
          disabled={loading}
        >
          {loading ? <CircularProgress color="inherit" size={20} /> : null}
          Create Short Link
        </Button>
      </form>
    </div>
  );
};
