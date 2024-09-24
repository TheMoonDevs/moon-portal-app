import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { ReactElement } from 'react';
import { TextFieldProps } from "@mui/material";

export interface AppInputProps {
    startIcon?: ReactElement;
    endIcon?: ReactElement;
}
export const Input = ({
    startIcon,
    endIcon,
    ...props
}: AppInputProps & TextFieldProps) => {
    return (
        <TextField {...props}
            id="standard-basic"
            sx={{
                "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                        borderRadius: "10px",
                    },
                    backgroundColor: "#F6F6F6",
                    "& input": {
                        color: "rgba(0, 0, 0, 0.8)",
                    },
                    "&.Mui-focused fieldset": {
                        borderColor: "#000000",
                    }
                },
                "& .MuiInputLabel-root": {
                    color: "rgba(0, 0, 0, 0.5)",
                },
                "& .Mui-focused .MuiInputLabel-root": {
                    color: "#000000",
                },
                "& .MuiInputBase-input.Mui-disabled": {
                    WebkitTextFillColor: "#00000075",
                },
            }}
            InputLabelProps={{
                style: { color: 'rgba(0, 0, 0, 0.5)' },
            }}
            InputProps={{
                startAdornment: startIcon ? (
                    <InputAdornment position="start" sx={{ color: "rgba(0, 0, 0, 0.5)" }}>
                        {startIcon}
                    </InputAdornment>
                ) : null,
                endAdornment: endIcon ? (
                    <InputAdornment position="end" sx={{ color: "rgba(0, 0, 0, 0.5)" }}>
                        {endIcon}
                    </InputAdornment>
                ) : null,
            }}
        />
    );
};