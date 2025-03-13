'use client'
import styled from "@emotion/styled";
import { PrivacyHTMLData } from "./PrivacyData";
import { TermsData } from "./TermsData";
import { SensePrivacyData } from "./sense/PrivacyData";
import theme from "@/styles/theme";
import { SectionWithGrids } from "../HomePage/SectionWithGrids";
import { SenseTermsData } from "./sense/TermsData";
import { DocumentPageType } from "@/utils/constants/AppInfo";
import { Link } from "@/components/App/Global/react-transition-progress/CustomLink";

const isMainDocPage = Object.values(DocumentPageType);

const DocumentPageStyled = styled.div<{ darkMode?: boolean }>`
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
  padding: 4em 4em 0 4em;

  & .doc-navbar {
    align-self: stretch;
    padding: 3em 2em;
    background-color: ${(props) => props.theme.fixedColors.whiteSmoke};
    border-right: 1px solid ${(props) => props.theme.fixedColors.lightSilver};

    > h4 {
      font-size: 1.5rem;
      line-height: 1;
      font-weight: bold;
      margin-bottom: 1rem;
      text-align: left;
      color: ${(props) => props.theme.fixedColors.black};
    }

    & .nav-list {
      display: flex;
      flex-direction: column;
      gap: 0.1em;
      color: ${(props) => props.theme.fixedColors.black};

      a {
        color: inherit;
        text-decoration: underline;
      }
    }
  }

  & .doc-content {
    padding: 5em 5em;
    background-color: ${(props) => !props.darkMode
    ? props.theme.fixedColors.whiteSmoke
    : props.theme.fixedColors.black
  };
    > p,
    h1,
    ul,
    li,
    h2,
    h3,
    h4,
    h5,
    h6 {
      text-align: left;
    }
  }
`;

export const DocumentPage = ({ docType }: { docType: DocumentPageType }) => {
  console.log(docType)
  return (
    <DocumentPageStyled darkMode={
      docType != DocumentPageType.PRIVACY && docType != DocumentPageType.TERMS
    }>
      {(docType === DocumentPageType.PRIVACY || docType === DocumentPageType.TERMS) && (
        <div className="doc-navbar">
          <h4>Documents</h4>
          <div className="nav-list">
            {Object.values(DocumentPageType)
              .filter((type) => type === DocumentPageType.PRIVACY || type === DocumentPageType.TERMS)
              .map((type) => (
                <Link href={`/documents/${type}`} key={type}>
                  <div className="doc-link">{type}</div>
                </Link>
              ))}
          </div>
        </div>
      )}
      <div
        className="doc-content"
        dangerouslySetInnerHTML={{
          __html:
            docType === DocumentPageType.PRIVACY ? PrivacyHTMLData :
              DocumentPageType.SENSE_PRIVACY ? SensePrivacyData :
                DocumentPageType.SENSE_TERMS ? SenseTermsData :
                  TermsData,
        }}
      />
    </DocumentPageStyled>
  );
};
