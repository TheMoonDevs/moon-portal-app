import media, { reverseMedia } from "@/styles/media";
import styled from "@emotion/styled";

export const ReferHeroStyled = styled.div`
  height: 100vh;
  color: ${(props) => props.theme.fixedColors.charcoal};
  background-color: ${(props) => props.theme.fixedColors.tealGreenBackground};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
  
  ${reverseMedia.tablet} {
    display: flex;
    flex-direction: row;
  }

  & .header_box {
    display: flex;
    flex-direction: row;
    justify-content: center;
    position: absolute;
    padding: 1em;
    top: 0;
    left: 0;
    right: 0;
    border-bottom: 1px solid ${(props) => props.theme.fixedColors.silver};
  }

  & .logobar {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    padding: 0 2rem;

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

    ${media.largeMobile} {
      margin-left: 0.5rem;
      font-size: 1rem;
      letter-spacing: 0.1rem;
    }
  }
  & .bold_box {
    padding: 2em;
    position: relative;
    display: flex ;
    justify-content: center;
    align-items: center;
    ${reverseMedia.tablet} {
      margin-top:50px;
    }
    ${reverseMedia.laptop} {
      margin-top:100px;
    }
  }

  & .bold_stamp {
    position: absolute;
    top: -30px;
    right: -20px;
    z-index: -1;
    width: 80px;
    height: 80px;

     ${reverseMedia.tablet} {
      width: 120px;
      height: 50px;
      top: -20px;
      right: -20px;
    }

    ${reverseMedia.laptop} {
      width: 80px;
      top: -30px;
      right: -30px;
      height: 80px;
      object-fit: contain;
    } 
  }

  & .mobile_stamp {
    display: block !important;
    top: -20px;
    right: 20px;
    z-index: 9;
    ${reverseMedia.tablet} {
      display: none !important;
    }
  }

  & .desktop_stamp {
    display: none !important;
    ${reverseMedia.tablet} {
      display: block !important;
    }
  }

  & .bold_content {
    position: relative;
    z-index: 10;
    
    ${reverseMedia.tablet} {
      width: 80%;
      margin: 0 auto;
    }
  }

  & .bold_bigtitle {
    font-weight: 700;
    cursor: pointer;
    color: ${(props) => props.theme.fixedColors.black};
    font-size: 4rem;
    line-height: 1;
    letter-spacing: 0.15em;
    text-align: center;
    text-transform: uppercase;
    font-weight: 900;
    font-family: "Poppins", sans-serif;
    z-index: 10;

    &::first-letter {
      color: ${(props) => props.theme.fixedColors.tealGreen};
    }

     

    ${reverseMedia.tablet} {
      font-size: 3rem;
      text-align: left; !important;
      margin-bottom: 1rem;
      font-size: 3rem;
    }

    ${reverseMedia.laptop} {
      font-size: 3.5rem;
    }

    ${reverseMedia.largeLaptop} {
      font-size: 4.5rem;
    }
  }

  & .bold_subtitle {
    cursor: pointer;
    color: ${(props) => props.theme.fixedColors.black};
    font-size: 1.5rem;
    line-height: 1.5;
    letter-spacing: 0.25em;
    text-align: center;
    text-transform: uppercase;
    font-weight: 900;
    font-family: "Poppins", sans-serif;
    z-index: 10;
/* 
    ${reverseMedia.largeMobile} {
      font-size: 3rem;
      text-align: left; !important;
    } */

    ${reverseMedia.tablet} {
      font-size: 3rem;
      text-align: left; !important;
    }

    ${reverseMedia.laptop} {
      font-size: 3.5rem;
    }

    ${reverseMedia.largeLaptop} {
      font-size: 4.5rem;
    }
  }

  & .bold_tagline {
    cursor: pointer;
    margin-top: 1rem;
    color: ${(props) => props.theme.fixedColors.tealGreenText};
    font-size: 1.25rem;
    line-height: 1;
    text-align: center;
    font-weight: 700;
    font-family: "Poppins", sans-serif;
    z-index: 10;


    ${reverseMedia.tablet} {
      font-size: 1.5rem;
      text-align: left; !important;
    }

    ${reverseMedia.laptop} {
      font-size: 2rem;
    }
  }

  & .caption_box {
    padding: 0 1em;
    font-size: 1rem;
    text-align: center;
    color: ${(props) => props.theme.fixedColors.darkGrey};
    display: flex ;
    align-items: center;
    justify-content: center;
    ${reverseMedia.largeMobile} {
      width: 80%; 
    }

    /* ${reverseMedia.largeMobile} {
     text-align: left;
     font-size: 1rem ;
     height: 100%;
     margin-top: 138px;
     padding: 0rem 2rem;
    } */
    
    ${reverseMedia.tablet} {
      height: 100%;
      margin-top: 138px;
      padding: 0rem 3rem;
      font-size: 1rem;
      width: 50%;
      text-align: left;
      border-left: 1px solid ${(props) => props.theme.fixedColors.silver};
    }

    ${reverseMedia.laptop} {
      margin-right: 50px;
      width: 40%;
      font-size: 1.5rem;
      padding: 0rem 3rem;
      border-left: 1px solid ${(props) => props.theme.fixedColors.silver};
    }
  }

  & .caption {
    ${reverseMedia.tablet} {
      margin-top: -100px;
    }
  }

  & .caption_small {
    display: none;

    ${reverseMedia.tablet} {
      display: block;
      font-size: 0.8rem;
      margin-top: 1rem;
    }
  }
`;
