import { DirectoryList, Link } from "@prisma/client";

export const toggleFavoriteLinksList = (
  prevFavList: Link[],
  currentFavoriteLink: Link
) => {
  if (prevFavList.find((link) => link.id === currentFavoriteLink.id)) {
    return prevFavList.filter((link) => link.id !== currentFavoriteLink.id);
  } else {
    return [...prevFavList, { ...currentFavoriteLink, isFavorite: true }];
  }
};

export const toggleFavoriteDirectoryList = (
  prevFavList: DirectoryList[],
  currentFavoriteDirectory: DirectoryList
) => {
  if (prevFavList.find((link) => link.id === currentFavoriteDirectory.id)) {
    return prevFavList.filter(
      (link) => link.id !== currentFavoriteDirectory.id
    );
  } else {
    return [...prevFavList, { ...currentFavoriteDirectory, isFavorite: true }];
  }
};

export const updateDirectoryPositions = (
  state: any,
  updatedDir: DirectoryList,
  isParent: boolean
) => {
  const targetArray = isParent
    ? (state.parentDirs as DirectoryList[])
    : (state.directories as DirectoryList[]);
  const index = targetArray.findIndex(
    (dir: DirectoryList) => dir.id === updatedDir.id
  );
  if (index !== -1) {
    targetArray[index] = updatedDir;
  }
};
