'use client';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Cancel } from '@mui/icons-material';
import { Box, Paper, Tooltip } from '@mui/material';
import { DataGrid, GridCheckCircleIcon, GridColDef } from '@mui/x-data-grid';
import { Invoice, User } from '@prisma/client';
import { useEffect, useState } from 'react';
const ClientsInvoice = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { user } = useUser();

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    PortalSdk.getData('/api/user', null)
      .then((data) => {
        setUsers(data?.data?.user || []);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    const fetchInvoices = async () => {
      try {
        const response = await fetch(`/api/client-invoice?clientId=${user.id}`);
        const responseJson = await response.json();
        setInvoices(responseJson.data);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      }
    };

    fetchInvoices();
  }, [user]);

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'title', headerName: 'Title', width: 150 },
    { field: 'description', headerName: 'Description', width: 200 },
    {
      field: 'devIds',
      headerName: 'Developers',
      width: 200,
      valueGetter: (value, row) => {
        const developers = users.filter((user) => row.devIds.includes(user.id));
        return developers.map((dev) => dev.name).join(', ');
      },
    },
    {
      field: 'amountTotal',
      headerName: 'Total Amount',
      width: 120,
      type: 'number',
      renderCell: (params) => `${params.value} USD`,
    },
    {
      field: 'amountToPay',
      headerName: 'Amount to Pay',
      width: 120,
      type: 'number',
      renderCell: (params) => `${params.value} USD`,
    },
    {
      field: 'amountDiscount',
      headerName: 'Discount',
      width: 120,
      type: 'number',
      renderCell: (params) => `${params.value} USD`,
    },
    {
      field: 'isInvoicePaid',
      headerName: 'Paid',
      width: 100,
      type: 'boolean',
      renderCell: (params) =>
        params.value ? (
          <Tooltip title="Paid">
            <GridCheckCircleIcon sx={{ color: 'green' }} />
          </Tooltip>
        ) : (
          <Tooltip title="Not Paid">
            <Cancel sx={{ color: 'red' }} />
          </Tooltip>
        ),
    },
    { field: 'payType', headerName: 'Payment Type', width: 120 },
    {
      field: 'invoicePdf',
      headerName: 'Invoice PDF',
      width: 180,
      renderCell: (params) => {
        return params.value ? (
          <div className="flex items-center gap-4">
            {/* <Tooltip title="View PDF">
              <a href={params.value} target="_blank" rel="noopener noreferrer">
                <span className="material-symbols-outlined">visibility</span>
              </a>
            </Tooltip> */}
            <Tooltip title="Download PDF">
              <a
                href={params.value}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="material-symbols-outlined">download</span>
              </a>
            </Tooltip>
          </div>
        ) : (
          'N/A'
        );
      },
    },
    // {
    //   field: 'workInfo',
    //   headerName: 'Work Info',
    //   width: 200,
    //   valueGetter: (value, row) => JSON.stringify(row.workInfo) || 'N/A',
    // },
    {
      field: 'startDate',
      headerName: 'Start Date',
      width: 150,
      type: 'date',
    },
    {
      field: 'endDate',
      headerName: 'End Date',
      width: 150,
      type: 'date',
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 150,
      type: 'date',
    },
    {
      field: 'updatedAt',
      headerName: 'Last Updated',
      width: 150,
      type: 'date',
    },
  ];

  const rows = invoices.map((invoice) => ({
    id: invoice.id,
    title: invoice.title,
    description: invoice.description || 'N/A',
    devIds: invoice.devIds || 'N/A',
    amountTotal: invoice.amountTotal.toFixed(2),
    amountToPay: invoice.amountToPay.toFixed(2),
    amountDiscount: invoice.amountDiscount.toFixed(2),
    isInvoicePaid: invoice.isInvoicePaid,
    payType: invoice.payType,
    invoicePdf: invoice.invoicePdf,
    // workInfo: invoice.workInfo ? JSON.stringify(invoice.workInfo) : 'N/A', // Convert JSON to string
    startDate: new Date(invoice.startDate),
    endDate: new Date(invoice.endDate),
    dueDate: new Date(invoice.dueDate),
    updatedAt: new Date(invoice.updatedAt),
  }));

  return (
    <div className="w-full p-6">
      <h2 className="mb-4 text-2xl font-bold">Invoices</h2>
      <Box sx={{ height: 400, width: '100%', margin: '0 auto' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5,
              },
            },
          }}
          sx={{
            '& .MuiDataGrid-container--top [role=row]': {
              backgroundColor: '#f5f5f5', // Light grey background
              color: '#333', // Darker text for contrast
              fontSize: '16px',
              fontWeight: 'bold',
            },
          }}
          pageSizeOptions={[5]}
          checkboxSelection
          disableRowSelectionOnClick
        />
      </Box>
    </div>
  );
};

export default ClientsInvoice;
