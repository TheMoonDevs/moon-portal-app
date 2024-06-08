import { Skeleton } from "@mui/material";

export const LoadingSkeleton = () => (
  <>
    <Skeleton height={100} />
    <Skeleton animation="wave" width={"100%"} />
    <Skeleton animation="wave" width={"90%"} />
    <Skeleton animation={false} width={"80%"} />
    <Skeleton animation="wave" width={"50%"} className="!mt-10" height={60} />
    <Skeleton animation="wave" width={"100%"} />
    <Skeleton animation="wave" width={"90%"} />
    <Skeleton animation={false} width={"80%"} />
  </>
);
