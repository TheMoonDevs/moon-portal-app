import * as React from "react";
import { useTable } from "react-table";
import EditJobPostModal from "@/pages/edit-jobpost/page";

function ScreeningTable() {
  const [data, setData] = React.useState([]);
  const [selectedJobPost, setSelectedJobPost] = React.useState({});
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

  const columns = React.useMemo(
    () => [
      {
        Header: "S.No",
        accessor: (row, i) => i + 1,
      },
      {
        Header: "Department",
        accessor: "dept_name",
      },
      {
        Header: "Description",
        accessor: "description",
      },
      {
        Header: "Skill",
        accessor: "skill_requirement",
      },
      {
        Header: "Title",
        accessor: "title",
      },
      {
        Header: "Status",
        accessor: "status",
      },
      {
        Header: "Actions",
        accessor: "actions", // Accessor to represent the Actions column
        Cell: ({ row }) => (
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => handleEdit(row.original._id)} // Replace with your edit function
              className="px-3 py-2 bg-blue-500 text-white rounded"
            >
              Edit
            </button>
            <button
              onClick={() => {
                handleDelete(row.original._id);
              }} // Replace with your delete function
              className="px-3 py-2 bg-red-500 text-white rounded"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({ columns, data });

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`/api/jobpost/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // If deletion is successful, update the data in the state
        const updatedData = data.filter((item) => item._id !== id);
        setData(updatedData);
      } else {
        console.error("Error deleting job post");
      }
    } catch (error) {
      console.error("Error deleting job post:", error);
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await fetch(`/api/jobpost/${id}`);
      if (response.ok) {
        const selectedPost = await response.json();
        console.log(selectedPost);
        setSelectedJobPost(selectedPost);
        setIsEditModalOpen(true);
      } else {
        console.error("Error fetching job post for editing");
      }
    } catch (error) {
      console.error("Error fetching job post for editing:", error);
    }
  };

  const handleEditSubmit = async (formData) => {
    try {
      const response = await fetch(`/api/jobpost/${selectedJobPost._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // If the update is successful, close the modal and update the data in the state
        setIsEditModalOpen(false);
        const updatedData = data.map((post) =>
          post._id === selectedJobPost._id ? formData : post
        );
        setData(updatedData);
      } else {
        console.error("Error updating job post");
      }
    } catch (error) {
      console.error("Error updating job post:", error);
    }
  };

  React.useEffect(() => {
    // Fetch data from your API endpoint
    fetch("/api/jobpost/getall")
      .then((response) => response.json())
      .then((data) => setData(data.jobPosts))
      .catch((error) => console.error("Error fetching data:", error));
  }, []); // Empty dependency array to run the effect only once on mount

  return (
    <div className="shadow-md overflow-x-auto">
      <table
        {...getTableProps()}
        className="min-w-full divide-y divide-gray-200"
      >
        <thead className="bg-gray-50">
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th
                  {...column.getHeaderProps()}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.render("Header")}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody
          {...getTableBodyProps()}
          className="bg-white divide-y divide-gray-200"
        >
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => (
                  <td
                    {...cell.getCellProps()}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {cell.render("Cell")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <EditJobPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit} // Add the handleEditSubmit function
        jobPostData={selectedJobPost}
      />
    </div>
  );
}

export default ScreeningTable;
