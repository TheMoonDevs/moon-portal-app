import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { ReactNode } from "react";

export const AppDropdown = (props: {
  label?: string;
  id: string;
  value: string;
  onChange:
    | ((event: SelectChangeEvent<string>, child: ReactNode) => void)
    | undefined;
  options: string[] | any[];
  className?: string;
}) => {
  return (
    <div className={props.className}>
      <InputLabel id={props.id}>{props.label}</InputLabel>
      <Select
        labelId={props.id}
        id={props.id + "-select"}
        value={props.value}
        label={props.label}
        name={props.id}
        onChange={props.onChange}
      >
        {props.options.map((option: string | any) =>
          typeof option === "string" ? (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ) : (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          )
        )}
      </Select>
    </div>
  );
};
