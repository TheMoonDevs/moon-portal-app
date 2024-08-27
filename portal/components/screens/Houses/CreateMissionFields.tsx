import { Grid } from '@mui/material';
import React, { useRef } from 'react';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { useUser } from '@/utils/hooks/useUser';
import { MARKDOWN_PLACEHOLDER } from '../Worklogs/WorklogTabs/TodoTab';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import { MDXEditorMethods } from '@mdxeditor/editor';
import { PillSelector } from './PillSelector';
import { MissionTask } from '@prisma/client';

export const pillOptions = [
  {
    label: 'yes',
    value: true,
  },
  {
    label: 'no',
    value: false,
  },
];

const housesList = [
  { label: 'Management', value: 'MANAGEMENT' },
  { label: 'Growth', value: 'GROWTH' },
  { label: 'Product Tech', value: 'PRODUCT_TECH' },
  { label: 'Executive', value: 'EXECUTIVE' },
];

type CreateMissionFieldsProps = {
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
};

const CreateMissionFields = ({ state, setState }: CreateMissionFieldsProps) => {
  const mdRef = useRef<MDXEditorMethods | null>(null);

  const { user } = useUser();
  const handleMarkdownChange = (content: string) => {
    const newContent = content.length === 0 ? MARKDOWN_PLACEHOLDER : content;
    mdRef?.current?.setMarkdown(newContent);
    setState((prev: any) => ({ ...prev, todoMarkdown: content }));
  };

  return (
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
        <label htmlFor='description' className='text-sm font-medium text-black'>
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
            setState({
              ...state,
              housePoints: parseInt(e.target.value, 10),
              indiePoints: parseInt(e.target.value, 10) * 100,
            })
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
            setState({
              ...state,
              indiePoints: parseInt(e.target.value, 10),
            })
          }
          className='w-full px-4 py-2 border border-gray-300 rounded-md'
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <p className='text-sm font-medium text-black'>Indie Balance</p>
        <p className='text-lg font-semibold text-black'>
          {state.indiePoints -
            state.tasks.reduce(
              (acc: number, task: MissionTask) => acc + task.indiePoints,
              0
            )}
        </p>
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
    </Grid>
  );
};

export default CreateMissionFields;
