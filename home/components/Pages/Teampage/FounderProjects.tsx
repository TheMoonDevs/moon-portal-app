'use client';

import { IProjects } from '@/components/Pages/HomePage/IndustrySection/IndustryData';

export const founderProjects: IProjects[] = [
    {
        title: 'Master React Custom Hooks',
        link: 'https://medium.com/themoondevs/5-fundamental-principles-master-react-custom-hooks-68a4cf7ab7a0',
        isHot: false,
        image_url: '/images/profiles/react-hooks-custom.webp',
        type: 'article',
        stats: [
            {
                value: '10k+',
                description: 'Monthly Readers',
            },
            {
                value: '4.8',
                description: 'User Rating',
            },
        ],
        description: 'Master the art of React custom hooks through proven design principles. Learn how strategic hook implementation can significantly reduce technical debt, optimize resource allocation, and streamline frontend development processes.',
        cta_text: 'Read Article',
    },
    {
        title: 'Mobile App - UX/UI with Dynamic pallettes',
        link: 'https://karcreativeworks.com/tasteplore-android-app',
        isHot: true,
        video_url: '/images/profiles/dynamic_colors.mp4',
        type: 'article',
        stats: [
            {
                value: '45%',
                description: 'Engagement Boost',
            },
            {
                value: '98%',
                description: 'User Satisfaction',
            },
        ],
        description: 'An innovative Android application featuring advanced dynamic theming capabilities and intuitive gesture-based navigation, revolutionizing the film rating experience.',
        cta_text: 'View Project',
    },
    {
        title: 'The Emerging Rivalry between Developers & AI',
        link: 'https://medium.com/themoondevs/the-emerging-rivalry-between-developers-ai-forecasting-the-future-from-the-ramblings-of-a-few-45956f5230ef',
        isHot: false,
        image_url: '/images/subhakar/airivalry.webp',
        type: 'article',
        stats: [
            {
                value: '15k+',
                description: 'Monthly Readers',
            },
            {
                value: '4.9',
                description: 'User Rating',
            },
        ],
        description: 'An in-depth analysis of the evolving relationship between developers and AI, exploring future implications for the tech industry, developer roles, and the balance between human expertise and machine learning capabilities.',
        cta_text: 'Read Article',
    },
    {
        title: 'Performance optimization for Next.js Apps',
        link: 'https://www.toptal.com/next-js/nextjs-rendering-types-page-speed-optimization',
        isHot: false,
        image_url: '/images/profiles/nextjs-speed-optimization.avif',
        type: 'article',
        stats: [
            {
                value: '76%',
                description: 'Load Time Reduction',
            },
            {
                value: '95+',
                description: 'Performance Score',
            },
        ],
        description: 'Comprehensive guide to implementing advanced performance optimization techniques in Next.js applications, delivering exceptional user experience and optimal load times.',
        cta_text: 'Read Article',
    },
    {
        title: 'A Spotify like Podcast Studio & Player',
        link: 'https://karcreativeworks.com/jingle-fm-webapp',
        isHot: false,
        video_url: '/images/profiles/jinglefm-player.mp4',
        type: 'article',
        stats: [
            {
                value: '50k+',
                description: 'Monthly Listeners',
            },
            {
                value: '99.9%',
                description: 'Uptime',
            },
        ],
        description: 'Enterprise-grade podcast platform featuring real-time audio analysis, dynamic waveform visualization, and seamless streaming capabilities for an immersive listening experience.',
        cta_text: 'View Project',
    }
];
