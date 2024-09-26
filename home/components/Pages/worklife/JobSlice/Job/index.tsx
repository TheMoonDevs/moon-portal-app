import { Content } from "@prismicio/client";
import { SliceComponentProps } from "@prismicio/react";
export type JobProps = SliceComponentProps<Content.JobSlice>;

const Job = ({ slice }: JobProps): JSX.Element => {
  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      Placeholder component for job_details (variation: {slice.variation})
      Slices
    </section>
  );
};

export default Job;
