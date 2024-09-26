import { JobSlice } from "@/prismicio-types";
import { JobInfoStyled } from "./JobInfo.styles";
import { PrismicRichText } from "@prismicio/react";
import { PrismicNextImage } from "@prismicio/next";

export const JobInfo = ({ slice }: { slice: JobSlice }) => {
  return (
    <JobInfoStyled>
      <div className="job_title_container">
        <PrismicNextImage
          className="jobs_image"
          field={slice.primary.image}
        />
      <h2 className="job_title">{slice.primary.title}</h2>
      </div>
      <h3 className="job_info_heading">Let&apos;s Work Together.</h3>
      <div className="job_description">
        <PrismicRichText field={slice.primary.description} />
      </div>
      <div className="job_info_requirements">Requirements</div>
      <div className="job_requirements">
        <PrismicRichText field={slice.primary.requirements} />
      </div>
    </JobInfoStyled>
  );
};
