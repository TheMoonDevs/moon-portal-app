import { PrismicNextImage } from '@prismicio/next';
import React from 'react';
import styled from '@emotion/styled';
import media from '@/styles/media';
import { Link } from '@/components/App/Global/react-transition-progress/CustomLink';

const JobCard = ({
  job,
  isTextVisible,
}: {
  job: any;
  isTextVisible: boolean;
}) => {
  return (
    <Link href={`${job.url}`}>
      <JobCardStyled>
        <PrismicNextImage
          field={job.info.image}
          className='wl_jobs_image'
          alt=''
        />
        <span className={`job_title ${isTextVisible ? 'visible' : ''}`}>
          {job.info.title}
        </span>
      </JobCardStyled>
    </Link>
  );
};

export default JobCard;

const JobCardStyled = styled.div`
  width: 239px;
  height: 239px;
  border: 1px solid hsla(0, 0%, 100%, 0.05);
  border-radius: 1.5rem;
  position: relative;

  ${media.largeMobile} {
    width: 100%;
  }

  & .wl_jobs_image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 1.5rem;
  }

  & .job_title {
    position: absolute;
    bottom: 1rem;
    width: calc(100% - 2rem);
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    background: rgba(0, 0, 0, 1);
    padding: 0.5rem 0.5rem;
    opacity: 0;
    transition: opacity 0.1s ease-in-out;
    border-radius: 1.5rem;
    transition: all 0.2s ease-in-out;
    margin: 0px 1rem;
    transform: translateY(100%);
    text-align: center;
  }

  & .job_title.visible {
    opacity: 1;
    transform: translateY(0);
  }

  &:hover {
    opacity: 0.8;
    transition: 0.2s ease-in-out;
  }

  &:hover .job_title {
    opacity: 1;
    transform: translateY(0);
  }
`;
