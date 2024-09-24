import media from "@/styles/media";
import styled from "@emotion/styled";

export const CareersHomeStyled = styled.div`
  & .wl_careers_title {
    font-size: 1.7em;
    color: #fff;
    padding: 1rem 1rem 1rem 1.2rem;
  }

  & .careers_container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8rem 1rem 8rem 1rem;
    width: 100%;

    ${media.tablet} {
      padding: 6rem 1rem 6rem 1rem;
    }

    ${media.largeMobile} {
      padding: 4rem 1rem 4rem 1rem;
    }
  }

  & .careers_grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;

    ${media.laptop} {
      grid-template-columns: repeat(4, 1fr);
    }

    ${media.tablet} {
      grid-template-columns: repeat(3, 1fr);
    }

    ${media.largeMobile} {
      grid-template-columns: repeat(1, 1fr);
      width: 100%;
      gap: 1rem;
    }
  }

  & .footer_wrapper {
    /* font-size: 1.5rem; */
  }
`;