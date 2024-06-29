import { TextField, Tooltip } from "@mui/material";
import { Minus, Plus } from "lucide-react";
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
  const [headers, setHeaders] = useState({
    service: "Service",
    weeks: "Weeks",
    unitPrice: "Unit Price",
  });

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

  const handleHeaderEdit = (field: keyof typeof headers, value: string) => {
    setHeaders({
      ...headers,
      [field]: value,
    });
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

  const renderEditableHeader = (field: keyof typeof headers, value: string) => (
    <TextField
      variant="standard"
      value={value}
      onChange={(e) => handleHeaderEdit(field, e.target.value)}
      InputProps={{
        disableUnderline: true,
        style: {
          minWidth: Math.max(50, value.length * 8),
          overflow: "visible",
        },
      }}
      inputProps={{
        style: {
          padding: "2px 4px",
          fontSize: "14px",
          fontWeight: "bold",
        },
      }}
      className="bg-transparent"
    />
  );

  return (
    <div className="mt-4 p-4 w-full bg-[#F5F5EF] overflow-visible">
      <table className="w-full mb-8   table-auto ">
        <thead>
          <tr className="border-y border-black">
            <th className="text-left p-2"></th>
            <th className="text-left p-2">
              {renderEditableHeader("service", headers.service)}
            </th>
            <th className="text-left p-2">
              {renderEditableHeader("weeks", headers.weeks)}
            </th>
            <th className="text-left p-2">
              {renderEditableHeader("unitPrice", headers.unitPrice)}
            </th>
            <th className="text-left p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className="group border-b border-black hover:bg-gray-100"
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <td className="p-1 relative">
                <div className="flex items-center">
                  {hoverIndex === index && (
                    <div className="absolute left-0 right-10 flex flex-col space-y-1">
                      <Tooltip title="Remove row" arrow placement="left">
                        <Minus
                          onClick={() => removeRow(index)}
                          size={18}
                          color="gray"
                          className="cursor-pointer hover:bg-red-200 rounded-lg "
                        />
                      </Tooltip>
                      <Tooltip title="Add row" arrow placement="left">
                        <Plus
                          onClick={addRow}
                          size={18}
                          color="gray"
                          className="cursor-pointer hover:bg-blue-200 rounded-lg"
                        />
                      </Tooltip>
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
                <span className="flex ">
                  ${renderEditableCell(index, "unitPrice", row.unitPrice)}
                </span>
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
    </div>
  );
};

export default InvoiceTable;
