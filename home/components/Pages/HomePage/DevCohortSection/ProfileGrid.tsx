'use client';

import { Grid, useMediaQuery } from '@mui/material';
import ProfileElement from './ProfileElement';

import { useState } from 'react';
import media from '@/styles/media';
import {
  IPublication,
  PublicationDialog,
} from '@/components/App/PublicationDialog';

export interface IProfileData {
  name: string;
  avatar: string;
  experience: string;
  domain: string;
  position: string;
  publications: IPublication[];
}
const ProfileData: IProfileData[] = [
  {
    name: 'John Doe', // Replace with actual name if available
    avatar: '/images/profiles/subhakar.png',
    experience: '11+ years, 28+ Startups',
    domain: 'Fullstack',
    position: 'Product Lead',
    publications: [
      {
        image_url: '/images/abstract-red.png',
        type: 'article',
        title: 'Web Dashboard for TokenHolders',
        description:
          'A high-performance dashboard built for managing token holdings.',
        link: 'https://example.com/token-dashboard',
      },
      {
        image_url: '',
        type: 'article',
        title: 'Master React Custom Hooks',
        description:
          'Deep dive into building optimized and reusable React hooks.',
        link: 'https://example.com/react-custom-hooks',
      },
      {
        image_url: '',
        type: 'article',
        title: 'Gen AI based duolingo app for skillups',
        description:
          'An AI-powered learning platform that enhances skill acquisition.',
        link: 'https://example.com/gen-ai-skillups',
      },
      {
        image_url: '',
        type: 'article',
        title: 'Performance optimization for Next.js Apps',
        description:
          'Techniques and strategies to boost performance in Next.js applications.',
        link: 'https://example.com/nextjs-optimization',
      },
    ],
  },
  {
    name: 'Jane Smith', // Replace with actual name
    avatar: '/images/profiles/subhakar.png',
    experience: 'Ex. Google - VP of Chrome',
    domain: 'Fullstack',
    position: 'Product Lead',
    publications: [
      {
        image_url: '',
        type: 'article',
        title: 'Master React Custom Hooks',
        description:
          'Deep dive into building optimized and reusable React hooks.',
        link: 'https://example.com/react-custom-hooks',
      },
      {
        image_url: '',
        type: 'article',
        title: 'Gen AI based duolingo app for skillups',
        description:
          'An AI-powered learning platform that enhances skill acquisition.',
        link: 'https://example.com/gen-ai-skillups',
      },
    ],
  },
  {
    name: 'Michael Lee',
    avatar: '/images/profiles/subhakar.png',
    experience: '11+ years, 28+ Startups',
    domain: 'Fullstack',
    position: 'Product Lead',
    publications: [
      {
        image_url: '',
        type: 'article',
        title: 'Master React Custom Hooks',
        description:
          'Deep dive into building optimized and reusable React hooks.',
        link: 'https://example.com/react-custom-hooks',
      },
      {
        image_url: '',
        type: 'article',
        title: 'Gen AI based duolingo app for skillups',
        description:
          'An AI-powered learning platform that enhances skill acquisition.',
        link: 'https://example.com/gen-ai-skillups',
      },
    ],
  },
  {
    name: 'Emily Carter',
    avatar: '/images/profiles/subhakar.png',
    experience: '11+ years, 28+ Startups',
    domain: 'Fullstack',
    position: 'Product Lead',
    publications: [
      {
        image_url: '',
        type: 'article',
        title: 'Master React Custom Hooks',
        description:
          'Deep dive into building optimized and reusable React hooks.',
        link: 'https://example.com/react-custom-hooks',
      },
      {
        image_url: '/images/abstract-red.png',
        type: 'article',
        title: 'Gen AI based duolingo app for skillups',
        description:
          'An AI-powered learning platform that enhances skill acquisition.',
        link: 'https://example.com/gen-ai-skillups',
      },
    ],
  },
  {
    name: 'David Johnson',
    avatar: '/images/profiles/subhakar.png',
    experience: '11+ years, 28+ Startups',
    domain: 'Fullstack',
    position: 'Product Lead',
    publications: [
      {
        image_url: '',
        type: 'article',
        title: 'Master React Custom Hooks',
        description:
          'Deep dive into building optimized and reusable React hooks.',
        link: 'https://example.com/react-custom-hooks',
      },
      {
        image_url: '',
        type: 'article',
        title: 'Gen AI based duolingo app for skillups',
        description:
          'An AI-powered learning platform that enhances skill acquisition.',
        link: 'https://example.com/gen-ai-skillups',
      },
    ],
  },
];
const ProfileGrid = () => {
  const [selectedPublication, setSelectedPublication] =
    useState<IPublication>();
  const [openDialog, setOpenDialog] = useState(false);
  const isTabletOrLess = useMediaQuery(media.tablet);

  return (
    <>
      <Grid
        justifyContent={'center'}
        className="!px-4 md:!p-0"
        sx={{
          ...(isTabletOrLess && {
            margin: '0 !important',
          }),
        }}
        container
        rowSpacing={{
          md: 2,
          xs: 10,
        }}
        columnSpacing={{
          md: 2,
        }}
      >
        <Grid
          item
          md={6}
          xs={12}
          className="!justify-center !pt-0 md:justify-start"
          sx={{
            display: 'flex',
            justifyContent: 'start',
            width: 'fit-content',
          }}
        >
          <ProfileElement
            setOpenDialog={setOpenDialog}
            setPublications={setSelectedPublication}
            position="top"
            size="medium"
            data={ProfileData[0]}
            borderColor="border-red-500"
          />
        </Grid>
        <Grid
          item
          md={6}
          xs={12}
          className="!justify-center md:!justify-end"
          sx={{ display: 'flex', justifyContent: 'end' }}
        >
          <ProfileElement
            setOpenDialog={setOpenDialog}
            setPublications={setSelectedPublication}
            size="medium"
            position="bottom"
            direction="rtl"
            className={isTabletOrLess ? '' : 'mt-20'}
            data={ProfileData[1]}
            borderColor="border-green-500"
          />
        </Grid>
        <Grid
          item
          md={12}
          xs={12}
          sx={{ display: 'flex', justifyContent: 'center' }}
        >
          <ProfileElement
            setOpenDialog={setOpenDialog}
            setPublications={setSelectedPublication}
            size={isTabletOrLess ? 'medium' : 'small'}
            data={ProfileData[2]}
            borderColor="border-yellow-500"
            layout={isTabletOrLess ? undefined : 'distant'}
            direction={isTabletOrLess ? undefined : 'rtl'}
            className={isTabletOrLess ? '' : '-translate-x-1/3'}
          />
        </Grid>
        <Grid
          item
          md={6}
          xs={12}
          className="!justify-center md:!justify-end"
          sx={{ display: 'flex', justifyContent: 'end' }}
        >
          <ProfileElement
            setOpenDialog={setOpenDialog}
            setPublications={setSelectedPublication}
            position="top"
            direction={isTabletOrLess ? 'rtl' : 'ltr'}
            size={isTabletOrLess ? 'medium' : 'small'}
            data={ProfileData[3]}
            borderColor="border-blue-500"
          />
        </Grid>
        <Grid
          item
          md={6}
          xs={12}
          className="!justify-center md:!justify-end"
          sx={{ display: 'flex', justifyContent: 'end' }}
        >
          <ProfileElement
            setOpenDialog={setOpenDialog}
            setPublications={setSelectedPublication}
            size={isTabletOrLess ? 'medium' : 'small'}
            position="bottom"
            data={ProfileData[4]}
            direction={isTabletOrLess ? 'ltr' : 'rtl'}
            borderColor="border-red-500"
          />
        </Grid>
      </Grid>
      <PublicationDialog
        setPublication={setSelectedPublication}
        setOpenDialog={setOpenDialog}
        open={openDialog && selectedPublication !== undefined}
        data={selectedPublication}
      />
    </>
  );
};

export default ProfileGrid;
