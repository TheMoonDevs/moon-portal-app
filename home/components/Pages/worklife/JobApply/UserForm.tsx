"use client";
import React, { useState } from "react";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { useAppDispatch } from "@/redux/store";
import { setGlobalToast } from "@/redux/ui/ui.slice";
import { MoonToast } from "@/components/App/Global/Toast";
import CircularProgress from "@mui/material/CircularProgress";
import { Input } from "@/components/App/Global/Input";
import { JobSlice, JobSliceDefaultItem } from "@/prismicio-types";
import { KeyTextField } from "@prismicio/client";
import { UserFormStyled } from "./UserForm.styles";

export const UserForm = ({
  slice,
  spreadsheetId,
  sheetId,
  rowHeaders,
}: {
  slice: JobSlice;
  spreadsheetId: string;
  sheetId: string;
  rowHeaders: string[];
}) => {
  const {
    loading,
    success,
    error,
    setLoading,
    setSuccess,
    setError,
    resetState,
  } = useAsyncState();
  const [rowData, setRowData] = useState<string[]>([]);
  const dispatch = useAppDispatch();

  const getIconNamebyLabel = (label: string) => {
    const lowerCaseLabel = label.toLowerCase();
    if (lowerCaseLabel.includes("name")) return "Person";
    if (lowerCaseLabel.includes("mobile") || lowerCaseLabel.includes("phone"))
      return "Call";
    if (lowerCaseLabel.includes("email")) return "Email";
    if (lowerCaseLabel.includes("link")) return "Link";
    return "Create";
  };

  const submitToSpreadsheet = async (
    rowData: any,
    spreadsheetId: string,
    sheetId: string
  ) => {
    const now = new Date();
    const formattedDateTime = now.toLocaleString("en-GB").replace(",", "");
    if (rowData[0] === "" || rowData[0] === undefined || rowData[0] === null) {
      // For adding timestamps to the first column
      rowData[0] = formattedDateTime;
    }

    const response = await fetch(
      `/api/spreadsheet?spreadsheetId=${spreadsheetId}&targetId=${sheetId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [rowData] }),
      }
    );
    return response;
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError({ isError: false, description: "" });

    try {
      const response = await submitToSpreadsheet(
        rowData,
        spreadsheetId,
        sheetId
      );

      if (response.ok) {
        setSuccess(true);
        dispatch(setGlobalToast(true));
        setRowData([]);
      } else {
        setError({ isError: true, description: "Response not submitted" });
      }
    } catch (error) {
      setError({ isError: true, description: (error as Error).message });
    } finally {
      setLoading(false);
      dispatch(setGlobalToast(true));
      setTimeout(() => {
        resetState();
      }, 5000);
    }
  };

  return (
    <>
      {error.isError && (
        <MoonToast
          message={error.description}
          position={{ vertical: "bottom", horizontal: "right" }}
          severity="error"
        />
      )}
      {success && (
        <MoonToast
          message={"Response Submitted Successfully"}
          position={{ vertical: "bottom", horizontal: "right" }}
          severity="success"
        />
      )}
      <UserFormStyled onSubmit={handleFormSubmit} className="user_form">
        {rowHeaders?.map((header, index) => {
          return header && header !== "" ? (
            <Input
              onChange={(e) => {
                let tempData = [...rowData];
                tempData[index] = e.currentTarget.value;
                setRowData(tempData);
              }}
              value={rowData[index] || ""}
              required
              disabled={loading}
              key={index}
              name={header}
              fullWidth
              label={header}
              endIcon={
                !loading ? (
                  <span className="material-symbols-outlined ms-thin">
                    {getIconNamebyLabel(header)}
                  </span>
                ) : (
                  <CircularProgress size={16} color="inherit" />
                )
              }
            />
          ) : null;
        })}
        {slice.items.map((item: JobSliceDefaultItem, index: number) => {
          return (
            <ChoiceQuestion
              key={index}
              question={item.question}
              options={item.options}
              type={item.question_type}
              rowData={rowData}
              setRowData={setRowData}
              rowIndex={index + rowHeaders.length}
              loading={loading}
            />
          );
        })}
        <button disabled={loading} type="submit" className="join_btn">
          Join TheMoonDevs
        </button>
      </UserFormStyled>
    </>
  );
};

const ChoiceQuestion = ({
  question,
  options,
  type,
  rowData,
  setRowData,
  rowIndex,
  loading,
}: {
  question: KeyTextField;
  options: KeyTextField;
  type: "Multi Select" | "Single Select";
  rowData: string[];
  setRowData: React.Dispatch<React.SetStateAction<string[]>>;
  rowIndex: number;
  loading: boolean;
}) => {
  const selectedOptions = rowData[rowIndex] ? rowData[rowIndex].split(",") : [];
  const handleOptionClick = (option: string) => {
    let newOptions = [];
    if (type === "Single Select") {
      newOptions = selectedOptions?.includes(option) ? [] : [option];
    } else {
      const currentOptions = rowData[rowIndex]
        ? rowData[rowIndex].split(",")
        : [];
      newOptions = currentOptions.includes(option)
        ? currentOptions.filter((o) => o !== option)
        : [...currentOptions, option];
    }
    const updatedRowData = [...rowData];
    updatedRowData[rowIndex] = newOptions.join(",");
    setRowData(updatedRowData);
  };

  return (
    <div>
      <h3 className="job_question">
        {question}&nbsp;({type})
      </h3>
      <div className="options_container">
        {options?.split(",").map((option, index) => {
          return (
            <span
              key={index}
              className="option"
              onClick={() => handleOptionClick(option)}
              style={{
                backgroundColor: selectedOptions.includes(option)
                  ? "#98FF53"
                  : "#EDEDED",
              }}
            >
              {selectedOptions.includes(option) &&
                (!loading ? (
                  <>
                    <span className="material-symbols-outlined ms-thin">
                      Done_All
                    </span>
                    &nbsp;
                  </>
                ) : (
                  <>
                    <CircularProgress size={16} color="inherit" />
                    &nbsp;
                  </>
                ))}
              {/* {!loading ? (
                <span
                  style={{
                    opacity: `${selectedOptions.includes(option) ? 1 : 0}`,
                  }}
                  className="material-symbols-outlined ms-thin"
                >
                  Done_All
                </span>
              ) : (
                <>
                  <CircularProgress size={16} color="inherit" />
                </>
              )}&nbsp; */}
              {option}
            </span>
          );
        })}
      </div>
    </div>
  );
};
