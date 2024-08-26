import { MissionTask } from '@/prisma/missionTasks';
import { Box, Grid, IconButton } from '@mui/material';
import React, { useCallback } from 'react';

const Tasks = ({
  tasks,
  setState,
}: {
  tasks: MissionTask[];
  setState: React.Dispatch<React.SetStateAction<any>>;
}) => {
  const handleDeleteTask = useCallback(
    (index: number) => {
      setState((prevState: any) => ({
        ...prevState,
        tasks: prevState.tasks.filter((_: any, i: number) => i !== index),
      }));
    },
    [setState]
  );

  return (
    <Box mt={2}>
      <p className='text-sm font-medium text-black'>Tasks</p>
      {tasks.length > 0 ? (
        <Grid container columnSpacing={1}>
          {tasks.map((task: MissionTask, index: number) => (
            <Grid item xs={12} sm={6} key={index}>
              <Box
                display='flex'
                alignItems='center'
                justifyContent='space-between'
                p={2}
                border='1px solid #ddd'
                borderRadius='4px'
                mb={2}
              >
                <Box>
                  <p className='text-sm font-semibold'>{task.title}</p>
                  <p className='text-xs text-gray-600'>{task.description}</p>
                </Box>
                <IconButton
                  onClick={() => handleDeleteTask(index)}
                  aria-label='Delete Task'
                >
                  <span className='material-symbols-outlined text-red-500'>
                    delete
                  </span>
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : (
        <p className='text-sm text-gray-500'>No tasks added yet</p>
      )}
    </Box>
  );
};

export default Tasks;
