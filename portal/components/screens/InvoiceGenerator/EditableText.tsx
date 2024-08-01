import React, { useState } from "react";
import { TextField } from "@mui/material";

interface EditableTextProps {
  initialValue: string | number;
  placeholder?: string;
  onChange?: (value: string | number) => void; // Optional onChange handler
  onSave?: (value: string | number) => void; // Optional onSave handler
  className?: string;
  type?: "text" | "number"; // Define type as text or number
}

const EditableText: React.FC<EditableTextProps> = ({
  initialValue,
  placeholder,
  onChange,
  onSave,
  className,
  type = "text", // Default type to text if not provided
}) => {
  const [value, setValue] = useState<string | number>(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue =
      type === "number"
        ? Math.max(0, parseFloat(e.target.value))
        : e.target.value;
    setValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      if (onSave) {
        onSave(value);
      }
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (onSave) {
      onSave(value);
    }
  };

  const handleClick = () => {
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <TextField
        variant="standard"
        value={String(value)}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        type={type}
        InputProps={{
          disableUnderline: true,
          style: {
            padding: 0,
            margin: 0,
            fontSize: "inherit",
            width: "inherit",
          },
          inputProps: {
            min: type === "number" ? 0 : undefined,
            style: {
              padding: 0,
              margin: 0,
              fontSize: "inherit",
              color: "inherit",
              lineHeight: "inherit",
              width: type === "number" ? "3rem" : "6rem",
              overflow: "show",
            },
          },
        }}
      />
    );
  }

  return (
    <div onClick={handleClick} className={`cursor-pointer ${className}`}>
      <span>
        {value !== undefined && value !== null && value !== "" ? (
          value
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </span>
    </div>
  );
};

export default EditableText;
