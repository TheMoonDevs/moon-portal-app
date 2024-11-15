'use client';
import { setCurrentView } from '@/utils/redux/quicklinks/slices/quicklinks.ui.slice';
import { VIEW } from './LinkList';
import { useAppDispatch, useAppSelector } from '@/utils/redux/store';
import { IconButton, Menu, MenuItem, Typography, useMediaQuery } from '@mui/material';
import media from '@/styles/media';
import { useState } from 'react';

const items = [
  {
    icon: 'fiber_smart_record',
    viewName: VIEW.thumbnail,
    label: 'Thumbnail View',
  },
  {
    icon: 'grid_view',
    viewName: VIEW.group,
    label: 'Grid View',
  },
  {
    icon: 'list',
    viewName: VIEW.list,
    label: 'List View',
  },
]

export const ViewButtonGroup = () => {
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery(media.largeMobile);

  const { currentView } = useAppSelector((state) => state.quicklinksUi);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <div className="relative float-right flex w-fit cursor-pointer items-center justify-end divide-x-2 border-2">
        {isMobile ? (
          <>
            <IconButton onClick={handleClick}>
              <span className="material-symbols-outlined">more_vert</span>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
            >
              {items.map((item) => (
                <MenuItem
                  key={item.icon}
                  onClick={() => {
                    dispatch(setCurrentView(item.viewName));
                    handleClose();
                  }}
                  className='!flex !items-center !gap-2'
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '20px' }}
                  >
                    {item.icon}
                  </span>
                  <Typography variant="body1">{item.label}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : (
          <>
            {items.map((item) => (
              <span
                className={`material-symbols-outlined p-2 ${
                  item.viewName === currentView
                    ? 'bg-neutral-900 text-neutral-200'
                    : 'bg-white text-neutral-800 hover:bg-neutral-200'
                }`}
                style={{ fontSize: isMobile ? '20px' : undefined }}
                key={item.icon}
                onClick={() => dispatch(setCurrentView(item.viewName))}
              >
                {item.icon}
              </span>
            ))}
          </>
        )}
      </div>
    </>
  );
};
