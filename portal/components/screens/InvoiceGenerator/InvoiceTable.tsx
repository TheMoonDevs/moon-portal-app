import React, { useState } from "react";
import { Tooltip } from "@mui/material";
import { Minus, Plus } from "lucide-react";
import EditableText from "./EditableText";

interface InvoiceRow {
  service: string;
  weeks: number;
  unitPrice: number;
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
    const newData: any = [...data];
    newData[index][field] =
      typeof value === "number" ? value : value.toString();
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

  return (
    <div className="mt-4 p-4 w-full bg-[#F5F5EF] overflow-visible">
      <table className="w-full mb-8 table-auto">
        <thead>
          <tr className="border-y border-black">
            <th className="text-left p-2"></th>
            <th className="text-left p-2 font-bold">
              <EditableText
                initialValue={headers.service}
                onSave={(value) =>
                  handleHeaderEdit("service", value.toString())
                }
                placeholder={`Enter ${headers.service} Name`}
                className="text-gray-700"
              />
            </th>
            <th className="text-left p-2 font-bold">
              <EditableText
                initialValue={headers.weeks.toString()}
                onSave={(value) => handleHeaderEdit("weeks", value.toString())}
                placeholder="0"
                className="text-gray-700"
              />
            </th>
            <th className="text-left p-2 font-bold">
              <EditableText
                initialValue={headers.unitPrice.toString()}
                onSave={(value) =>
                  handleHeaderEdit("unitPrice", value.toString())
                }
                placeholder="0"
                className="text-gray-700"
              />
            </th>
            <th className="text-left p-2 font-bold">Total</th>
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
                    <div className="absolute left-0 right-0 flex flex-col">
                      <Tooltip title="Remove row" arrow placement="top-end">
                        <Minus
                          onClick={() => removeRow(index)}
                          size={18}
                          color="gray"
                          className="cursor-pointer hover:bg-red-200 rounded-lg"
                        />
                      </Tooltip>
                      <Tooltip title="Add row" placement="bottom-end" arrow>
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
                <EditableText
                  initialValue={row.service}
                  onSave={(value) => handleInlineEdit(index, "service", value)}
                  placeholder={`Enter ${headers.service} Name`}
                />
              </td>
              <td className="p-2">
                <EditableText
                  initialValue={row.weeks.toString()}
                  onSave={(value) =>
                    handleInlineEdit(index, "weeks", parseInt(value as string))
                  }
                  type="number"
                  placeholder="0"
                />
              </td>
              <td className="p-2">
                <span className="flex">
                  $
                  <EditableText
                    initialValue={row.unitPrice.toString()}
                    onSave={(value) =>
                      handleInlineEdit(
                        index,
                        "unitPrice",
                        parseInt(value as string)
                      )
                    }
                    type="number"
                    placeholder="0"
                  />
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
