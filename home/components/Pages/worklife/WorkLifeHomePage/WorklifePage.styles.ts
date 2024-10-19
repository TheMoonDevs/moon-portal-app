'use client'
import media from "@/styles/media";
import styled from "@emotion/styled";

export const WorklifePageStyled = styled.div`
  width: 100%;
  color: #000000;
  //background: #f5f5f5;
  font-size: 1.5rem;
  ${media.laptop} {
    font-size: 1.2rem;
  }
  ${media.tablet} {
    font-size: 1rem;
  }
`;
