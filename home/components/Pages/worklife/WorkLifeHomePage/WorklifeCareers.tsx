'use client'

import {
  WorklifeCareersStyled,
  WorklifeJobsCardStyled,
} from "./WorklifeCareers.style";
import { PrismicNextImage } from "@prismicio/next";
import { JobapplicationDocument } from "@/prismicio-types";
import { PrismicRichText } from "@prismicio/react";
import { Link } from "@/components/App/Global/react-transition-progress/CustomLink";

export const WorklifeCareers = ({
  jobPosts,
}: {
  jobPosts: JobapplicationDocument[];
}) => {
  const _mappedPosts = jobPosts.map((jp) => {
    return {
      url: jp.url,
      type: jp.type,
      id: jp.id,
      last_publication_date: jp.last_publication_date,
      info: jp.data.slices.find((slice) => slice.slice_type === "job")?.primary,
    };
  });
  return (
    <WorklifeCareersStyled>
      <h3 className="wl_careers_title">Careers</h3>
      <div className="jobs_container">
        {_mappedPosts?.map((job: (typeof _mappedPosts)[0], index: number) => (
          <WorklifeJobsCard key={index} job={job} />
        ))}
      </div>
    </WorklifeCareersStyled>
  );
};

const WorklifeJobsCard = ({ job }: { job: any }) => {
  return (
    <Link href={`${job.url}`}>
      <WorklifeJobsCardStyled>
        <PrismicNextImage field={job.info.image} className="wl_jobs_image" />
        <span className="jobs_container_title">{job.info.title}</span>
        <div className="jobs_container_description">
          <PrismicRichText field={job.info.description} />
        </div>
        <div className="jobs_container_button">Apply to Join</div>
      </WorklifeJobsCardStyled>
    </Link>
  );
};
