export const ArrayHelper = {
  reverseSortByDate: (array: any[], key: string) => {
    return array.sort((a, b) => {
      return new Date(b[key]).getTime() - new Date(a[key]).getTime();
    });
  },
};
