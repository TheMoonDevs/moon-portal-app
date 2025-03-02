'use client';

import { Dialog, Grid, useMediaQuery } from '@mui/material';
import ProfileElement from './ProfileElement';
import { CardBody, CardContainer, CardItem } from '@/components/ui/3d-card';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import media from '@/styles/media';

export interface IPublication {
  title: string;
  description: string;
  link: string;
  image_url: string;
  type: string;
}
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
  const [selectedPublication, setSelectedPublication] = useState<
    IPublication & {
      name: string;
      avatar: string;
    }
  >();
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

const PublicationDialog = ({
  open,
  data,
  setPublication,
  setOpenDialog,
}: {
  open: boolean;
  setOpenDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setPublication: React.Dispatch<
    React.SetStateAction<
      (IPublication & { name: string; avatar: string }) | undefined
    >
  >;
  data: (IPublication & { name: string; avatar: string }) | undefined;
}) => {
  return (
    <Dialog
      open={open}
      onClose={() => {
        setOpenDialog(false);
        setTimeout(() => setPublication(undefined), 500);
        // setTimeout(() => setPublication(undefined), 500);
      }}
      sx={{ zIndex: 9999, backdropFilter: 'blur(8px)' }}
      PaperProps={{
        sx: {
          width: 'fit-content',
          height: 'fit-content',
          shadow: 'none',
          boxShadow: 'none',
          borderRadius: '1.5rem',
          background: 'transparent',
          overflow: 'visible',
        },
      }}
    >
      <CardContainer className="inter-var">
        <CardBody className="group/card group relative h-auto w-auto overflow-hidden rounded-3xl border-2 border-gray-50 bg-[rgba(43,43,43,0.5)] dark:border-white/[0.2] dark:bg-black dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] sm:w-[30rem] md:hover:overflow-visible">
          <CardItem
            translateZ="100"
            className="w-full !overflow-hidden rounded-tl-xl rounded-tr-xl md:group-hover:rounded-bl-xl md:group-hover:rounded-br-xl"
          >
            <Image
              src={data?.image_url || ''}
              height="1000"
              width="1000"
              className="h-60 w-full object-cover group-hover/card:shadow-xl"
              alt="thumbnail"
            />
          </CardItem>
          <div className="p-4">
            <CardItem
              translateZ="50"
              className="mt-2 text-xl font-bold text-gray-50 dark:text-white"
            >
              {data?.title}
            </CardItem>
            <CardItem
              as="p"
              translateZ="60"
              className="mt-2 max-w-sm text-sm text-neutral-400 dark:text-neutral-300"
            >
              {data?.description}
            </CardItem>
            <div className="mt-4 flex items-center justify-between">
              <CardItem
                translateZ={20}
                as={Link}
                href="https://twitter.com/mannupaaji"
                target="__blank"
                className="flex items-center rounded-xl py-2 text-xs font-normal dark:text-white"
              >
                <Image
                  src={data?.avatar || ''}
                  height={20}
                  width={20}
                  className="mr-2 inline-block rounded-full"
                  alt={data?.name || 'Author Photo'}
                />
                <span>{data?.name}</span>
              </CardItem>
              <CardItem
                translateZ={20}
                as="button"
                className="rounded-xl bg-gray-50 px-4 py-2 text-xs font-bold text-black dark:bg-white dark:text-black"
              >
                {data?.link && (
                  <Link href={data?.link} className="flex items-center gap-2">
                    <div>
                      {data.type === 'article' ? 'Read Full Article' : 'Watch'}
                    </div>
                    <span className="material-symbols-outlined !text-lg">
                      arrow_right_alt
                    </span>
                  </Link>
                )}
              </CardItem>
            </div>
          </div>
        </CardBody>
      </CardContainer>
    </Dialog>
  );
};

export default ProfileGrid;
