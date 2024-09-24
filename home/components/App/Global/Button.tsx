import media from "@/styles/media";
import { FirebaseSDK } from "@/utils/service/firebase";
import styled from "@emotion/styled";
import { ButtonProps } from "@mui/material";

const ButtonStyled = styled.div<any>`
  cursor: pointer;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-size: 1.25rem;
  font-weight: 300;
  background-color: ${(props) => props.theme.fixedColors.black};
  color: ${(props) => props.theme.fixedColors.white};
  transform: scale(1);
  transition: 0.1s ease-in-out;
  display: flex;
  align-items: center;
  overflow: hidden;

  ${media.tablet} {
    font-size: 1rem;
    padding: 0.4rem 2rem;
  }

  &:hover {
    transform: scale(1.02);
    // background-color: ${(props) => props.theme.fixedColors.silver};
    // color: ${(props) => props.theme.fixedColors.black};
  }

  & .button_icon {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    transform: translateX(-1.5em) scale(2);
    background-color: rgba(255, 255, 255, 0.25);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;

    > span {
      font-size: 0.65em;
      transform: translateX(0.25em);
    }
  }

  & .button_text {
    transform: translateX(0em);
  }
`;

export interface AppButtonProps {
  startIcon: string;
  children: any;
}

export const AppButton = ({
  startIcon,
  children,
  ...props
}: AppButtonProps & ButtonProps) => {
  return (
    <ButtonStyled {...props}>
      {startIcon && (
        <div className="button_icon">
          <span className="material-symbols-outlined">{startIcon}</span>
        </div>
      )}
      <div className="button_text">{children}</div>
    </ButtonStyled>
  );
};
