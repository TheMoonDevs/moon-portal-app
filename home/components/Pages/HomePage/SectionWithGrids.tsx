import media from "@/styles/media";
import theme from "@/styles/theme";
import styled from "@emotion/styled";

const SectionWithGridsStyled = styled.div`
  display: grid;
  grid-template-columns: 4em auto 4em;
  width: 100%;
  border-bottom: 1px solid ${(props) => props.theme.fixedColors.lightSilver};

  ${media.laptop} {
    grid-template-columns: 3em auto 3em;
  }

  ${media.tablet} {
    grid-template-columns: 2em auto 2em;
  }

  ${media.largeMobile} {
    grid-template-columns: 1em auto 1em;
  }

  & .left_grid {
    border-right: 1px solid ${(props) => props.theme.fixedColors.lightSilver};
  }

  & .right_grid {
    border-left: 1px solid ${(props) => props.theme.fixedColors.lightSilver};
  }
`;

export const SectionWithGrids = (
  Section: ({ children }: { children?: any }) => JSX.Element,
  style: any
) => {
  const WrappedComponent = ({ children }: { children?: any }) => {
    return (
      <SectionWithGridsStyled
        className="section_with_grids"
        style={
          style
            ? {
                ...style,
                borderColor: style.color || theme.fixedColors.lightSilver,
              }
            : {}
        }
      >
        <div
          className="left_grid"
          style={{
            borderColor: style ? style.color : theme.fixedColors.lightSilver,
          }}
        ></div>
        <Section></Section>
        <div
          className="right_grid"
          style={{
            borderColor: style ? style.color : theme.fixedColors.lightSilver,
          }}
        ></div>
      </SectionWithGridsStyled>
    );
  };
  return WrappedComponent;
};
