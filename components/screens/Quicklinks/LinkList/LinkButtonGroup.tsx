import { Link as Quicklink } from "@prisma/client";

export const LinkButtonGroup = ({
  link,
  handleFavoriteClick,
  handleDeleteLink,
  deleteButtonId,
  setDeleteButtonId,
}: {
  link: Quicklink;
  handleFavoriteClick: (link: Quicklink) => void;
  handleDeleteLink: (linkId: string) => void;
  deleteButtonId: string | null | undefined;
  setDeleteButtonId: React.Dispatch<
    React.SetStateAction<string | null | undefined>
  >;
}) => {
  return (
    <div className="flex flex-col gap-2 items-center absolute right-6 top-0">
      <span
        className={`${
          link.isFavorite
            ? "material-symbols-filled"
            : "material-symbols-outlined"
        } material-icons !hidden group-hover:!block group-hover:!opacity-50 hover:scale-110 cursor-pointer transition-all text-red-500`}
        onClick={(event) => handleFavoriteClick(link)}
      >
        favorite
      </span>
      {deleteButtonId === link.id ? (
        <div className="flex gap-2 flex-col">
          <span
            className={`material-symbols-outlined !hidden group-hover:!block group-hover:!opacity-50 hover:scale-110 cursor-pointer transition-all`}
            onClick={() => handleDeleteLink(link.id)}
          >
            done
          </span>
          <span
            className={`material-symbols-outlined !hidden group-hover:!block group-hover:!opacity-50 hover:scale-110 cursor-pointer transition-all`}
            onClick={() => setDeleteButtonId(null)}
          >
            close
          </span>
        </div>
      ) : (
        <span
          className={`material-symbols-outlined !hidden group-hover:!block group-hover:!opacity-50 hover:scale-110 cursor-pointer transition-all`}
          onClick={() => setDeleteButtonId(link.id)}
        >
          delete
        </span>
      )}
    </div>
  );
};
