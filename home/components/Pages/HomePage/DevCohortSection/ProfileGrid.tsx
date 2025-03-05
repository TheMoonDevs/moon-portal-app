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
let ProfileData: IProfileData[] = [
  {
    name: 'Subhakar T.', // Replace with actual name if available
    avatar: '/images/profiles/subhakar.png',
    experience: '11+ years, 28+ Startups',
    domain: 'Fullstack',
    position: '- Fractional CTO',
    publications: [
      {
        image_url: '/images/profiles/react-hooks-custom.webp',
        type: 'article',
        title: 'Master React Custom Hooks',
        description:
          'Writing react custom hooks is as much a design skill as it is a logical one. In a large scale application, the technical debt might amount to saving thousands of dollars in resources, and months of effort of the frontend team.',
        link: 'https://medium.com/themoondevs/5-fundamental-principles-master-react-custom-hooks-68a4cf7ab7a0',
      },
      {
        video_url: '/images/profiles/dynamic_colors.mp4',
        type: 'article',
        title: 'Mobile App - UX/UI with Dynamic pallettes',
        description:
          'A Native android app for film rating with dynamic theming & unique gesture oriented controls.',
        link: 'https://karcreativeworks.com/tasteplore-android-app',
        cta: 'Read Full Case-study',
      },
      {
        image_url: '/images/profiles/nextjs-speed-optimization.avif',
        type: 'article',
        title: 'Performance optimization for Next.js Apps',
        description:
          'Techniques and strategies to boost performance in Next.js applications.',
        link: 'https://www.toptal.com/next-js/nextjs-rendering-types-page-speed-optimization',
      },
      {
        video_url: '/images/profiles/jinglefm-player.mp4',
        type: 'article',
        title: 'A Spotify like Podcast Studio & Player',
        description:
          'The audio stream from the podcast is captured in a blob format and analysed using AudioAnalyzer and the waveform is drawn...',
        cta: 'Read Full Case-study',
        link: 'https://karcreativeworks.com/jingle-fm-webapp',
      },
    ],
  },
  {
    name: 'Jane Smith', // Replace with actual name
    avatar: '/images/profiles/jane.png',
    experience: 'FinTech - 12+ projects',
    domain: 'Fullstack',
    position: '- Backend Dev',
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
    name: 'Kshitij S.',
    avatar: '/images/profiles/kshitij.png',
    experience: '3+ years, 10+ projects',
    domain: 'Frontend',
    position: '- UX/UI Engineer',
    publications: [
      {
        image_url: '/images/profiles/z-index.png',
        type: 'article',
        title: 'Deconstructing Z-Index - Msiconceptions',
        description:
          'CSS can be complex and nuanced, and misunderstandings or misuse of its properties often result in significant debugging efforts. without a solid grasp of how z-index operates, developers can easily encounter unexpected layout issues, where elements do not layer as intended.',
        link: 'https://medium.com/themoondevs/deconstructing-z-index-understanding-the-common-misconceptions-and-css-behavior-90cad9f98d24',
      },
      {
        image_url: '/images/profiles/sense-ai.png',
        type: 'article',
        cta: 'View Product',
        title: 'Gen AI based duolingo app for skillups',
        description:
          'Sense Ai is a gen AI based quiz application that generates quizzes to learn based on user interest & taste profiles.',
        link: 'https://play.google.com/store/apps/details?id=com.themoondevs.sense&hl=en_IN',
      },
    ],
  },
  {
    name: 'Jaden V.',
    avatar: '/images/profiles/jaden.png',
    experience: 'VR/AR Apps - 8+ years',
    domain: '3js Expert',
    position: '- Hybrid App developer',
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
    name: 'Pramod G.',
    avatar: '/images/profiles/pramod.png',
    experience: 'Ex. Sony - AI/ML Engineer',
    domain: 'LLM & Generative AI',
    position: '',
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
    name: 'Vishwajeet Y.',
    avatar: '/images/profiles/vishwajeet.png',
    experience: 'AWS / GCP - Engineer',
    domain: 'Cloud solutions',
    position: '- DevOps Engineer',
    publications: [
      {
        image_url: '/images/profiles/blockchain-cicd.png',
        type: 'article',
        title: 'Decentralized Devops - blockchain powered CI/CD',
        description:
          'Deep dive into building a next-level approach to secure CI/CD with blockchain. When you have teams spread across multiple organizations or countries, keeping everything centralized just doesn’t cut it anymore.',
        link: 'https://medium.com/themoondevs/decentralized-devops-a-next-level-approach-to-secure-ci-cd-with-blockchain-eca349a3a947',
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
];
const ProfileGrid = () => {
  const [selectedPublication, setSelectedPublication] =
    useState<IPublication>();
  const [openDialog, setOpenDialog] = useState(false);
  const isTabletOrLess = useMediaQuery(media.tablet);
  const [currentProfielData, setCUrrentProfileData] = useState<IProfileData[]>(
    ProfileData.slice(2).sort(() => Math.random() - 0.5),
  );



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
            data={currentProfielData[0]}
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
            data={currentProfielData[1]}
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
            data={currentProfielData[2]}
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
