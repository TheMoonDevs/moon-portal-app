import media from "@/styles/media";
import styled from "@emotion/styled";

export const JobInfoStyled = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  row-gap: 2rem;
  font-family: "DB Mono", monospace;

  & .job_info_heading {
    font-weight: 500;
    color: #000000;
    font-size: 1em;

    ${media.tablet} {
      font-size: 1.2em;
    }
  }

  & .job_title {
    color: #000000;
    font-size: 1.5em;
    font-weight: 500;

    ${media.tablet} {
      text-align: center;
      margin-bottom: 1rem;
    }
  }

  & .job_info_requirements {
    font-weight: 500;
    color: #000000;
    font-size: 1em;

    ${media.tablet} {
      font-size: 1.2em;
    }
  }

  & .job_description,
  .job_requirements {
    color: #00000075;
    font-family: "Didcat Gothic", sans-serif;
    font-size: 0.7em;

    ${media.tablet} {
      font-size: 0.85em;
    }
  }

  .job_title_container {
    display: flex;
    width: 100%;
    justify-content: flex-start;
    gap: 1rem;
    ${media.tablet} {
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  }

  .jobs_image {
    display: flex;
    justify-content: center;
    margin-top: 10px;
    border-radius: 10px;
    max-width: 75px;
    height: 100px;
    object-fit: cover;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    ${media.tablet} {
      height: 75px;
      max-width: 100px;
    }
  }
`;
