import React, { useRef, useState } from 'react';
import { Box, Modal, IconButton, Button, Grid, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { MARKDOWN_PLACEHOLDER } from '../Worklogs/WorklogTabs/TodoTab';
import { useUser } from '@/utils/hooks/useUser';
import { User } from '@prisma/client';

const housesList = [
  { label: 'Management', value: 'MANAGEMENT' },
  { label: 'Growth', value: 'GROWTH' },
  { label: 'Product Tech', value: 'PRODUCT_TECH' },
  { label: 'Executive', value: 'EXECUTIVE' },
];

const pillOptions = [
  {
    label: 'yes',
    value: true,
  },
  {
    label: 'no',
    value: false,
  },
];

const CreateMission = ({
  isOpen,
  onClose,
  houseMembers,
}: {
  isOpen: boolean;
  onClose: () => void;
  houseMembers: User[];
}) => {
  const [state, setState] = useState({
    title: '',
    house: '',
    housePoints: '',
    indiePoints: '',
    completedAt: dayjs(new Date()),
    expiresAt: dayjs(new Date()),
    isCompleted: false,
    isExpirable: true,
    todoMarkdown: '*',
  });
  const mdRef = useRef<MDXEditorMethods | null>(null);
  const { user } = useUser();

  const handleMarkdownChange = (content: string) => {
    const newContent = content.length === 0 ? MARKDOWN_PLACEHOLDER : content;
    mdRef?.current?.setMarkdown(newContent);
    setState((prev) => ({ ...prev, todoMarkdown: content }));
  };

  const handleSubmit = () => {
    const missionData = {
      ...state,
      housePoints: Number(state.housePoints),
      indiePoints: Number(state.indiePoints),
    };
    console.log(missionData); // Replace with API call
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'
      disableEnforceFocus
    >
      <Box
        className='w-full max-w-2xl bg-white rounded-lg p-8 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-lg overflow-y-auto no-scrollbar outline-none'
        sx={{
          maxHeight: '80vh',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <IconButton
            onClick={onClose}
            className='absolute top-4 right-4 bg-gray-300 hover:bg-gray-200 rounded-full flex items-center justify-center w-8 h-8 shadow-lg'
            sx={{ position: 'absolute' }}
          >
            <span className='material-symbols-outlined text-black'>close</span>
          </IconButton>

          <Grid container spacing={3} className='pt-4'>
            <Grid item xs={12}>
              <label className='text-sm font-medium text-black' htmlFor='title'>
                Title
              </label>
              <input
                type='text'
                id='title'
                value={state.title}
                onChange={(e) => setState({ ...state, title: e.target.value })}
                className='w-full px-4 py-2 border border-gray-300 rounded-md'
              />
            </Grid>
            <Grid item xs={12}>
              <label
                htmlFor='description'
                className='text-sm font-medium text-black'
              >
                Description
              </label>
              <div className='h-[150px] overflow-y-scroll border border-gray-300 rounded-md p-2'>
                <MdxAppEditor
                  ref={mdRef}
                  key={`${user?.id}`}
                  markdown={
                    state.todoMarkdown.trim().length === 0
                      ? MARKDOWN_PLACEHOLDER
                      : state.todoMarkdown
                  }
                  className='flex-grow h-full'
                  contentEditableClassName={`mdx_ce ${
                    state.todoMarkdown.trim() === MARKDOWN_PLACEHOLDER.trim()
                      ? ' mdx_uninit '
                      : ''
                  } leading-1 imp-p-0 grow w-full h-full`}
                  onChange={handleMarkdownChange}
                />
              </div>
            </Grid>
            <Grid item xs={12} sm={6}>
              <label
                className='text-sm font-medium text-black'
                htmlFor='select-house'
              >
                Select House
              </label>
              <select
                id='select-house'
                value={state.house}
                onChange={(e) => setState({ ...state, house: e.target.value })}
                className='w-full px-4 py-2 border border-gray-300 rounded-md'
              >
                <option value='' disabled>
                  Select House
                </option>
                {housesList.map((house) => (
                  <option key={house.value} value={house.value}>
                    {house.label}
                  </option>
                ))}
              </select>
            </Grid>
            <Grid item xs={12} sm={6}>
              <label
                className='text-sm font-medium text-black'
                htmlFor='house-points'
              >
                House Points
              </label>
              <input
                type='number'
                id='house-points'
                value={state.housePoints}
                onChange={(e) =>
                  setState({ ...state, housePoints: e.target.value })
                }
                className='w-full px-4 py-2 border border-gray-300 rounded-md'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <label
                className='text-sm font-medium text-black'
                htmlFor='indie-points'
              >
                Indie Points
              </label>
              <input
                type='number'
                id='indie-points'
                value={state.indiePoints}
                onChange={(e) =>
                  setState({ ...state, indiePoints: e.target.value })
                }
                className='w-full px-4 py-2 border border-gray-300 rounded-md'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <p className='text-sm font-medium text-black'>Indie Balance</p>
              <p className='text-lg font-semibold text-black'>1000</p>
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label='Completed At'
                value={state.completedAt}
                onChange={(newValue) =>
                  setState({ ...state, completedAt: newValue || dayjs() })
                }
                className='w-full'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label='Expires At'
                value={state.expiresAt}
                onChange={(newValue) =>
                  setState({ ...state, expiresAt: newValue || dayjs() })
                }
                className='w-full'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <PillSelector
                label='Is Completed'
                options={pillOptions}
                selectedValue={state.isCompleted}
                onChange={(value) => setState({ ...state, isCompleted: value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <PillSelector
                label='Is Expirable'
                options={pillOptions}
                selectedValue={state.isExpirable}
                onChange={(value) => setState({ ...state, isExpirable: value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant='contained'
                color='primary'
                sx={{ py: 2 }}
                onClick={handleSubmit}
              >
                Create Mission
              </Button>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Box>
    </Modal>
  );
};

const PillSelector = ({
  label,
  options,
  selectedValue,
  onChange,
}: {
  label: string;
  options: { label: string; value: any }[];
  selectedValue: any;
  onChange: (value: any) => void;
}) => {
  return (
    <div>
      <label className='text-sm font-medium text-black'>{label}</label>
      <div className='flex gap-2 mt-2'>
        {options.map((option) => (
          <Button
            key={option.value}
            variant={selectedValue === option.value ? 'contained' : 'outlined'}
            onClick={() => onChange(option.value)}
            className='px-4 py-1 rounded-full focus:outline-none'
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CreateMission;
