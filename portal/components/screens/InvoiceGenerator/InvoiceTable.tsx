import { Paper, TextField } from "@mui/material";
import { CircleMinus, CirclePlus } from "lucide-react";
import React, { useState } from "react";

interface InvoiceRow {
  service: string;
  weeks: number;
  unitPrice: number;
  [key: string]: string | number;
}

const initialData: InvoiceRow[] = [
  { service: "Refactoring of WAGMI", weeks: 2, unitPrice: 200 },
  { service: "Migration + BugFixes + SocialLogin", weeks: 1, unitPrice: 200 },
];

const InvoiceTable: React.FC = () => {
  const [data, setData] = useState<InvoiceRow[]>(initialData);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const handleInlineEdit = (
    index: number,
    field: keyof InvoiceRow,
    value: string | number
  ) => {
    const newData = [...data];
    newData[index][field] =
      field === "weeks" || field === "unitPrice"
        ? parseFloat(value as string) || 0
        : (value as string);
    setData(newData);
  };

  const addRow = () => {
    setData([...data, { service: "", weeks: 0, unitPrice: 0 }]);
  };

  const removeRow = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
  };

  const calculateTotal = () => {
    return data.reduce((total, row) => total + row.weeks * row.unitPrice, 0);
  };

  const renderEditableCell = (
    index: number,
    field: keyof InvoiceRow,
    value: string | number
  ) => (
    <TextField
      variant="standard"
      value={value}
      onChange={(e) => handleInlineEdit(index, field, e.target.value)}
      onBlur={(e) => handleInlineEdit(index, field, e.target.value || 0)}
      InputProps={{
        disableUnderline: true,
        style: {
          minWidth: Math.max(50, value.toString().length * 8),
          overflow: "visible", // Ensure overflow is visible
        },
      }}
      inputProps={{
        style: {
          padding: "2px 4px",
          fontSize: "14px",
        },
      }}
      className="bg-transparent"
    />
  );

  return (
    <Paper className="mt-4 p-4 w-full overflow-visible">
      <table className="w-full mb-8 table-auto">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2"></th>
            <th className="text-left p-2">Service</th>
            <th className="text-left p-2">Weeks</th>
            <th className="text-left p-2">Unit Price</th>
            <th className="text-left p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className="group border-b hover:bg-gray-100"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <td className="p-1 relative">
                <div className="flex items-center">
                  {hoverIndex === index && (
                    <div className="absolute left-0 right-10 flex flex-col space-y-1">
                      <CircleMinus
                        onClick={() => removeRow(index)}
                        size={18}
                        color="gray"
                        className="cursor-pointer "
                      />
                      <CirclePlus
                        onClick={addRow}
                        size={18}
                        color="gray"
                        className="cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </td>

              <td className="p-2">
                {renderEditableCell(index, "service", row.service)}
              </td>
              <td className="p-2">
                {renderEditableCell(index, "weeks", row.weeks)}
              </td>
              <td className="p-2">
                {renderEditableCell(index, "unitPrice", row.unitPrice)}
              </td>
              <td className="p-2">{row.weeks * row.unitPrice}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="p-2 text-right font-semibold">
              Subtotal
            </td>
            <td className="p-2">{calculateTotal()}</td>
          </tr>
          <tr>
            <td
              colSpan={4}
              className="p-2 font-bold text-xl md:text-2xl text-right relative"
            >
              <div className="absolute top-0 right-0 border-t-2 w-32 border-gray-700"></div>
              Total
            </td>
            <td className="p-2 font-bold text-xl md:text-2xl relative">
              <div className="absolute top-0 right-0 w-full border-t-2 border-gray-700"></div>
              {calculateTotal()}
            </td>
          </tr>
        </tbody>
      </table>
    </Paper>
  );
};

export default InvoiceTable;
