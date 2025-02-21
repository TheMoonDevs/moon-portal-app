'use client';
import { prettyPrintDateInMMMDD } from '@/utils/helpers/prettyprint';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { Cancel, DoNotDisturbOn } from '@mui/icons-material';
import { Avatar, Box, Paper, Tooltip } from '@mui/material';
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
    {
      field: 'title',
      headerName: 'ID',
      width: 120,
      renderCell: (params) => (
        <p className="py-2 text-sm uppercase tracking-wide text-neutral-900">
          {params.row.title}
        </p>
      ),
    },
    {
      field: 'info',
      headerName: 'Info',
      flex: 1,
      renderCell: (params) => (
        <div className="flex flex-col p-1">
          <p className="text-xl text-neutral-700">{params.row.description}</p>
          <span className="text-xs">
            {prettyPrintDateInMMMDD(params.row.startDate as Date)} -{' '}
            {prettyPrintDateInMMMDD(params.row.endDate)}
          </span>
        </div>
      ),
    },
    {
      field: 'devIds',
      headerName: 'Developers',
      width: 200,
      renderCell: (params) => {
        const developers = users.filter((user) =>
          params.row.devIds.includes(user.id),
        );
        return (
          <div className="flex flex-col justify-start gap-2 py-3">
            {developers.map((dev) => (
              <div className="flex items-center gap-2">
                <Avatar
                  src={dev.avatar || '/images/avatar.png'}
                  alt={dev.name || ''}
                  sx={{ width: 24, height: 24 }}
                />
                <span key={dev.id}>{dev.name}</span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      field: 'billing',
      headerName: 'Payment Info',
      width: 250,
      renderCell: (params) => (
        <div className="flex flex-col p-2">
          <div className="flex items-center justify-between gap-2 p-1">
            <span className="text-neutral-500">Total</span>
            <span>${params.row.amountTotal}</span>
          </div>
          <div className="flex items-center justify-between gap-2 p-1">
            <span className="text-neutral-500">Markdown</span>
            <span>- ${params.row.amountDiscount}</span>
          </div>
          <div className="flex items-center justify-between gap-2 p-1">
            <span className="text-neutral-500">Amount to Pay</span>
            <span className="text-lg font-bold">${params.row.amountToPay}</span>
          </div>
        </div>
      ),
    },
    {
      field: 'isInvoicePaid',
      headerName: 'Payment Status',
      width: 180,
      renderCell: (params) => {
        const dueDate = new Date(params.row.dueDate);
        const today = new Date();
        const isOverdue = today > dueDate;

        return (
          <div className="flex flex-col gap-2 p-2">
            <div className="flex items-center gap-2">
              {params.row.isInvoicePaid ? (
                <>
                  <GridCheckCircleIcon sx={{ color: 'green' }} />
                  <p className="text-xs">Paid via {params.row.payType}</p>
                </>
              ) : isOverdue ? (
                <>
                  <Cancel sx={{ color: 'red' }} />
                  <p className="text-xs">Outstanding</p>
                </>
              ) : (
                <>
                  <DoNotDisturbOn sx={{ color: 'orange' }} />
                  <p className="text-xs">Pending</p>
                </>
              )}
            </div>
            <span className="text-xs text-gray-500">
              Due on {dueDate.toDateString()}
            </span>
          </div>
        );
      },
    },
    {
      field: 'paidDate',
      headerName: 'Paid On',
      width: 180,
      renderCell: (params) => {
        if (!params.row.isInvoicePaid) return 'N/A';
        return new Date(params.row.updatedAt).toDateString(); // Use updatedAt as fallback
      },
    },
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
    paidDate: invoice.paidDate || 'N/A',
    // workInfo: invoice.workInfo ? JSON.stringify(invoice.workInfo) : 'N/A', // Convert JSON to string
    startDate: new Date(invoice.startDate),
    endDate: new Date(invoice.endDate),
    dueDate: new Date(invoice.dueDate),
    updatedAt: new Date(invoice.updatedAt),
  }));

  return (
    <div className="w-full p-6">
      <h2 className="mb-4 h-full text-2xl font-bold">Invoices</h2>
      <Box sx={{ height: 400, width: '100%', margin: '0 auto' }}>
        <DataGrid
          getRowHeight={() => 'auto'}
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
          disableRowSelectionOnClick
        />
      </Box>
    </div>
  );
};

export default ClientsInvoice;
