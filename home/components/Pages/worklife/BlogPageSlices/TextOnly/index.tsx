import media from "@/styles/media";
import styled from "@emotion/styled";
import Prism from "prismjs";
// import 'prismjs/themes/prism.css'; //light theme
// import "prismjs/themes/prism-funky.css"; //dark theme
import "prismjs/themes/prism-okaidia.css"; // dark theme
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-git.js";
import "prismjs/components/prism-docker.js";
import "prismjs/components/prism-graphql.js";
import "prismjs/components/prism-powershell.js";
import "prismjs/components/prism-solidity.js";
import "prismjs/plugins/line-numbers/prism-line-numbers.js";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";
import { PrismicRichText } from "@prismicio/react";
import { TextOnlySlice } from "@/prismicio-types";
import { useEffect } from "react";
const TextOnly = ({ slice }: { slice: TextOnlySlice }): JSX.Element => {
  useEffect(() => {
    Prism.highlightAll();
  }, []);
  if (slice.variation === "break") {
    return (
      <div style={{ backgroundColor: "#fff" }}>
        {Array.from({ length: slice.primary.number_of_breaks as number }).map(
          (_, index) => (
            <br key={index} />
          )
        )}
      </div>
    );
  }
  return (
    <TextOnlyStyled
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
    >
      {slice.variation === "default" &&
        slice.items.map((item, index) => (
          <PrismicRichText key={index} field={item.text} />
        ))}
      {slice.variation === "code" &&
        slice.items.map(
          (item, index) =>
            item.code && (
              <div key={index} className="code_card">
                <div className="header">
                  <div className="top">
                    <div className="circle">
                      <span className="red circle2"></span>
                    </div>
                    <div className="circle">
                      <span className="yellow circle2"></span>
                    </div>
                    <div className="circle">
                      <span className="green circle2"></span>
                    </div>
                    <div className="title">
                      <p id="title2">{item.code_file_name}</p>
                    </div>
                  </div>
                  <span
                    onClick={() => {
                      navigator.clipboard.writeText(item.code as string);
                      alert("Copied to clipboard");
                    }}
                    title="Copy To Clipboard"
                    className="copy_icon material-symbols-outlined icon small check_icon"
                  >
                    copy_all
                  </span>
                </div>
                <pre className="line-numbers">
                  <code className={`language-${item.code_language}`}>
                    {item.code}
                  </code>
                </pre>
              </div>
            )
        )}
    </TextOnlyStyled>
  );
};
export default TextOnly;

const TextOnlyStyled = styled.section`
  color: #000;
  background-color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 1.5rem;

  ${media.laptop} {
    font-size: 1.5rem;
  }
  ${media.tablet} {
    font-size: 1.25rem;
  }
  ${media.largeMobile} {
    font-size: 0.8rem;
    text-align: center;
  }
  padding: 0.5em 15em;
  ${media.laptop} {
    padding: 0.5em 2em;
  }

  ul {
    list-style-type: disc;
    padding-left: 1em;
    font-size: 0.8em;
  }

  ol {
    list-style-type: decimal;
    padding-left: 1em;
    font-size: 0.8em;
  }

  a {
    color: #1746a2;
  }

  h1 {
    font-size: 2.2em;
    padding: 0.3em 0;
  }

  h2 {
    font-size: 2em;
    padding: 0.3em 0;
  }

  h3 {
    font-size: 1.7em;
    padding: 0.3em 0;
  }

  h4 {
    font-size: 1.5em;
    padding: 0.3em 0;
  }

  h5 {
    font-size: 1.3em;
    padding: 0.3em 0;
  }

  h6 {
    font-size: 1.1em;
    padding: 0.3em 0;
  }

  p {
    font-size: 0.8em;
    padding: 0.3em 0;
  }

  .block-img {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  & .code_card {
    // background-color: #000;
    background-color: #1d1e22;
    // background-color: #fff;
    margin: 1em 0;
    padding: 0.5rem 1rem;
    border-radius: 12px;
  }

  & .top {
    display: flex;
    align-items: end;
    padding-left: 10px;
  }

  & .circle {
    padding: 0 4px;
  }

  & .circle2 {
    display: inline-block;
    align-items: center;
    width: 10px;
    height: 10px;
    padding: 1px;
    border-radius: 5px;
  }

  & .red {
    background-color: #ff605c;
  }

  & .yellow {
    background-color: #ffbd44;
  }

  & .green {
    background-color: #00ca4e;
  }

  & .copy_icon {
    cursor: pointer;
    color: white;
  }

  & .header {
    margin: 5px;
    margin-top: 5px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  & #title2 {
    color: white;
    padding-left: 1em;
    font-size: 1rem;
  }

  & pre {
    font-size: 14px;
  }
`;
