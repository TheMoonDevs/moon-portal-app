import media from "@/styles/media";
import styled from "@emotion/styled";

export const UserFormStyled = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1.5em;
  align-items: center;

  & .job_question {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    font-family: "DB Mono", monospace;
    color: #000000;
    font-size: 0.8em;
  }

  & .options_container {
    font-size: 0.8em;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    width: 100%;
    padding: 1em 0;
  }

  & .option {
    padding: 0.25em 1em;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 1em;
    font-family: "DB Mono", monospace;
    color: #000000;
    cursor: pointer;
    user-select: none;
    font-size: 0.8em;
  }

  & .join_btn {
    margin-top: 2.5em;
    padding: 0.75rem 2rem;
    border-radius: 1.5rem;
    border-width: 1px;
    border-color: #4b5563;
    width: fit-content;
    font-family: "DB Mono", monospace;
    color: #000000;
    border: 5px solid rgb(34 197 94);
    font-size: 0.7em;
    cursor: pointer;
    background-color: #ffffff;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

    :hover {
      border-color: rgb(34 197 94);
      background-color: rgb(34 197 94);
      color: #fff;
    }
  }
`;
