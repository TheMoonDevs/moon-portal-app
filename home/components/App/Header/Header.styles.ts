import media from "@/styles/media";
import { SingleLine } from "@/styles/snippets";
import styled from "@emotion/styled";

const filterStyles = `
  mix-blend-mode: exclusion;
  filter: invert(1);
`

export const HeaderStyled = styled.div`
  width: 100%;
  height: 4em;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  & .logobar {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    padding: 0 2rem;
    ${filterStyles}

    ${media.largeMobile} {
      padding: 0 0 0 0.75rem;

      > img {
        width: 2rem;
        height: 2rem;
      }
    }
  }

  & .app_title {
    font-size: 1.25rem;
    font-weight: 300;
    cursor: pointer;
    margin-left: 1rem;
    color: ${(props) => props.theme.fixedColors.black};
    text-transform: uppercase;
    letter-spacing: 0.25rem;

    ${media.tablet} {
      margin-left: 0.5rem;
      font-size: 1rem;
      letter-spacing: 0.1rem;
      ${SingleLine}
    }
  }

  & .button_trial {
    cursor: pointer;
    display: flex;
    align-items: center;
    color: ${(props) => props.theme.fixedColors.charcoalGrey};
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    margin-right: 2rem;
    border-radius: 0.5rem;
    font-weight: 700;
    ${filterStyles}

    &:hover {
      background-color: ${(props) => props.theme.fixedColors.white};
    }

    ${media.tablet} {
      font-size: 0.75rem;
      padding: 0.5rem 0.5rem;
      margin-right: 0.5rem;
      ${SingleLine}
    }
  }

  & .button_icon {
    line-height: 0;
    > span {
      font-size: 1.2rem;
    }

    ${media.largeMobile} {
      display: none;
    }
  }
`;
