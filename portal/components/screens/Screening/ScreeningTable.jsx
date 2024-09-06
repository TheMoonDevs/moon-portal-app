import { useState, useEffect, useMemo } from "react";
import { useTable } from "react-table";
import EditJobPostModal from "@/pages/edit-jobpost/page";
import { NewJobPostModal } from "./JobPosts/_JobPostModal";
import { useAppSelector } from "@/utils/redux/store";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { TMD_PORTAL_API_KEY } from "@/utils/constants/appInfo";
function ScreeningTable() {
  const [data, setData] = useState([]);
  const [selectedJobPost, setSelectedJobPost] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const jobPostsRefresh = useAppSelector((state) => state.ui.jobPostsRefresh);

  const columns = useMemo(
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
      const response = await fetch(`/api/jobPost?id=${id}}`, {
        method: "DELETE",
        headers: {
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
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
      const response = await fetch(`/api/jobPost?id=${id}`);
      if (response.ok) {
        const selectedPostsData = await response.json();
        console.log(selectedPostsData);
        if (selectedPostsData.jobPosts.length > 0) {
          setSelectedJobPost(selectedPostsData.jobPosts[0]);
        }
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
      const response = await fetch(`/api/jobPost`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          tmd_portal_api_key: TMD_PORTAL_API_KEY,
        },
        body: JSON.stringify({ ...formData, id: selectedJobPost.id }),
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

  useEffect(() => {
    // Fetch data from your API endpoint
    PortalSdk.getData("/api/jobPost/getAll")
      .then((data) => setData(data?.data?.jobPost))
      .catch((error) => console.error("Error fetching data:", error));
  }, [jobPostsRefresh]); // Empty dependency array to run the effect only once on mount

  return (
    <div className="shadow-md overflow-x-auto">
      <table
        {...getTableProps()}
        className="min-w-full divide-y divide-gray-200"
      >
        <thead className="bg-gray-50">
          {headerGroups.map((headerGroup, index) => (
            <tr key={index} {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column, index2) => (
                <th
                  key={index2}
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
          {rows.map((row, index) => {
            prepareRow(row);
            return (
              <tr key={index} {...row.getRowProps()}>
                {row.cells.map((cell, index2) => (
                  <td
                    key={index2}
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

      <NewJobPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit} // Add the handleEditSubmit function
        jobPostData={selectedJobPost}
      />
    </div>
  );
}

export default ScreeningTable;
