import { IPublication } from '@/components/App/PublicationDialog';

export interface IProjects extends IPublication {
  isHot?: boolean;
}
interface IIndustryAndProjects {
  industry: string;
  projects: IProjects[];
}

export const projectsData: IIndustryAndProjects[] = [
  {
    industry: 'Crypto',
    projects: [
      {
        title: 'BoB based gaming web3 competitions',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'VRF based randomness',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Pre IPO based ERC-20 Tokens (CryptoCoin)',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'bitcoin fork chain (EVM based)',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'NFT & ERC-20 Platforms',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Wallet Plugins for Browsers',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Base Chain Platforms',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Smart Wallet Integration (Zero Gas Fees)',
        link: '',
        isHot: true,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Embedded Wallet Setup',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Ramp Integrations for Onboarding Users',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
    ],
  },
  {
    industry: 'Ai',
    projects: [
      {
        title: 'Gen AI integrations (image, video, audio)',
        link: 'https://aiflux.cc/',
        isHot: false,
        image_url: '/images/assets/gen-ai-image.png',
        type: 'article',
        description:
          'A text-to-image generation platform that allows users to create images from text prompts.',
        cta_text: 'Try Demo',
      },
      {
        title: 'Ecommerce Chatbot',
        link: '',
        isHot: false,
        image_url: '/images/assets/ecomChatBot.gif',
        type: 'article',
        description:
          'Developed a conversational AI platform that guides customers through product discovery, handles order inquiries, and provides personalized recommendations resulting in a 42% reduction in support ticket volume.',
      },{
        title: 'Real-Time Sentiment Analysis for Customer Support Calls',
        link: '',
        isHot: false,
        image_url: '/images/assets/Call-Sentiment-Analysis-Score.png',
        type: 'article',
        description:
          'Developed a novel audio preprocessing pipeline that maintains accuracy even with poor connection quality. Created an intervention alert system that reduced negative call outcomes by 42%  ',
      },{
        title: 'RAG-Based Voice Assistant for Industrial Equipment Manuals',
        link: 'https://www.cloudtalk.io/blog/ai-performance-evaluation/',
        isHot: false,
        image_url: '/images/assets/rag-based-image.png',
        type: 'article',
        description:
          'Engineered a custom vector database architecture that reduced query time by 78% for complex technical information.\n  Integrated with proprietary hardware interfaces that traditional LLM frameworks can not support',
        cta_text: 'View Case Study',
      },{
        title: 'Multimodal Content Moderation for UGC Platform',
        link: '',
        isHot: false,
        image_url: '/images/assets/architecture.png',
        type: 'article',
        description:
          'Solved cross-lingual evasion tactics by implementing a semantic understanding layer that works across 14 languages. Accelerated processing time from 2.1s to 0.3s by optimizing the inference pipeline',
      },
      {
        title: 'LLM-Powered Contract Generation & Analysis',
        link: '',
        isHot: false,
        image_url: '/images/assets/65a7b6e7380ad549731faa31_analyze.gif',
        type: 'article',
        description:
          'Created a custom diff visualization system that highlights risk factors in legal documents that even the clients legal team had overlooked. Reduced integration complexity by building a middleware layer that works with legacy document management systems',
        cta_text: 'See Demo',
      },
      {
        title: 'Predictive Inventory Management for Perishable Goods',
        link: '',
        isHot: false,
        image_url: '/images/assets/inventory-managment.png',
        type: 'article',
        description:
          'Engineered a feature extraction system that identifies seasonal demand patterns 4x more accurately than traditional forecasting',
      },{
        title: 'AI Based Language Learning Platform',
        link: 'https://www.kann.app/',
        isHot: true,
        image_url: '/images/assets/languageLearningApp.avif',
        type: 'article',
        description:
          'Created a goal-oriented learning engine that dynamically adjusts content difficulty based on individual performance metrics, reducing time-to-fluency by 32%.',
        cta_text: 'Visit Website',
      },
    ],
  },
  {
    industry: 'SaaS',
    projects: [
      {
        title: 'AR 3d model placements in React Native App',
        link: 'https://cobalt-act-e19.notion.site/AR-Apps-with-React-Native-1aebcad0aeeb80688c00c64655820f2c?pvs=4',
        isHot: false,
        image_url: '/images/assets/1_5N3_Wq8LX9pyebiAtJdT4g.gif',
        type: 'article',
        description:
          'A cross-platform 3D model rendering system for React Native that enables photorealistic AR product previews with 85% reduced load times through progressive mesh loading.',
        cta_text: 'View Case Study',
      },
      {
        title: 'Integrating live collaboration (like figma)',
        link: 'https://cobalt-act-e19.notion.site/Building-a-Real-Time-Collaborative-Design-System-Lessons-from-the-Trenches-1aebcad0aeeb803f8578d20311033ce8?pvs=4',
        isHot: true,
        image_url: '/images/assets/Innovative-AI-Projects-to-Showcase-on-Your-Website.png',
        type: 'article',
        description:
          'Engineered a conflict-free replicated data structure (CRDT) backend that enables sub-20ms collaborative editing with intelligent merge resolution even in high-latency environments.',
      },
      {
        title: 'Slack, Discord, Twitter Bots for Internal updates',
        link: '',
        isHot: false,
        image_url: '/images/assets/TheMoonDevs-bot-DM-TheMoonDevs-Slack-03-06-2025_02_32_PM.png',
        type: 'article',
        description:
          'Engineered a custom Discord-based workflow automation system that streamlines meeting scheduling, payment tracking, and timesheet management through a unified interface.',
      },
      {
        title: 'Predictive analytics & AI-powered dashboards',
        link: '',
        isHot: false,
        image_url: '/images/assets/Example-Output-Ask-AI.webp',
        type: 'article',
        description:
          'A high-performance dashboard built for managing team and projects.',
      },
      {
        title: 'Ecommerce RAG based Framework',
        link: '',
        isHot: false,
        image_url: '/images/assets/ragForEcommerce.webp',
        type: 'article',
        description:
          'Engineered a RAG-based product discovery system that combines visual recognition with contextual understanding to deliver hyper-personalized recommendations, increasing conversion rates by 47%.',
      },
      {
        title: 'Workplace tools for enterprises',
        link: '',
        isHot: false,
        image_url: '/images/assets/internalTools.png',
        type: 'article',
        description:
          'Built an integrated team productivity platform that reduces context-switching by 63% through AI-powered workflow orchestration and cross-tool data synchronization.',
      },
      {
        title: 'webRTC based live streaming meets',
        link: 'https://cobalt-act-e19.notion.site/1aebcad0aeeb8013a858f3483a8b3f9e?pvs=4',
        isHot: false,
        image_url: '/images/assets/webRTC.webp',
        type: 'article',
        description:
          'A WebRTC-based communication system with AI-powered real-time language translation that maintains sub-100ms latency even on congested networks.',
        cta_text: 'View Case Study',
      },
    ],
  },
  {
    industry: 'App',
    projects: [
      {
        title: 'AR 3d model placements in React Native App',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'NFC card Authorization / Registrations',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Social Tracking App for mariners',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'React Web Apps deployed hybrid',
        link: '',
        isHot: true,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Interactive Gesture Experiences for App',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Contact based syncing for a Social App',
        link: 'https://cobalt-act-e19.notion.site/Reimagining-Social-Connections-Contact-Based-Syncing-for-Modern-Social-Apps-1adbcad0aeeb805088aec98ff8ebf3b6?pvs=4',
        isHot: false,
        image_url: '/images/assets/contactSync.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
        cta_text: 'View Case Study',
      },
      {
        title: 'Biometric & Passkey Authentications',
        link: 'https://www.authsignal.com/features/biometric-authentication',
        isHot: true,
        image_url: '/images/assets/67520d8cdf764efa88b871e6_biometric-authentication-optimize-user-experience-p-800.png',
        type: 'article',
        description:
          'Reimagined user authentication with a frictionless system that leverages device-native biometrics and passkeys, eliminating password vulnerabilities while reducing authentication time by 74% and boosting conversion rates across mobile and desktop platforms.',
        cta_text: 'Visit Website',
      },
    ],
  },
  {
    industry: 'Misc',
    projects: [
      {
        title: 'Threejs based virtual product view',
        link: 'https://cobalt-act-e19.notion.site/Beyond-Static-Images-Creating-Immersive-3D-Product-Experiences-with-Three-js-1adbcad0aeeb80178ce6e72657e876ba?pvs=4',
        isHot: false,
        image_url: '/images/assets/clockThreeD.jpg',
        type: 'article', 
        description:
          'Transformed complex CAD files into web-optimized 3D experiences with realistic materials, intuitive interactions, cross-device performance optimization, and seamless integration into existing digital platforms.',
        cta_text: 'View Case Study',
      },
      {
        title: 'DevOps Automation for Startups: Secure Private Repo Deployment on VPS',
        link: 'https://cobalt-act-e19.notion.site/Breaking-the-DevOps-Bottleneck-Automating-Private-Repo-Deployments-on-VPS-1adbcad0aeeb80a4b049d34d846f621a?pvs=4',
        isHot: false,
        image_url: '/images/assets/devOPSAutomations.png',
        type: 'article',
        description:
          'Slashed deployment time by 90% while achieving zero failures, reclaiming 60+ developer hours monthly, maintaining perfect deployment reliability, and cutting infrastructure costs by 40% compared to managed cloud services.',
      },
      {
        title: 'Telegram Mini Apps',
        link: 'https://cobalt-act-e19.notion.site/Dino-Click-1adbcad0aeeb80f2a844c4c1077a0538?pvs=4',
        isHot: false,
        image_url: '/images/assets/telegramMiniApps.jpg',
        type: 'article',
        description:
          'A telegram mini app that allows users to play a game and earn rewards.',
        cta_text: 'View Case Study',
      },
      {
        title: 'Unity + Photon Multiplayer Games',
        link: 'https://cobalt-act-e19.notion.site/Unity-Game-1adbcad0aeeb801fbcf7fb955a42223d?pvs=4',
        isHot: false,
        image_url: '/images/assets/unityPhoton.gif',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
        cta_text: 'View Case Study',
      },{
        title: 'Real-Time Data Visualization Framework for IoT Sensors',
        link: 'https://cobalt-act-e19.notion.site/Real-Time-Visualization-Framework-for-Resource-Constrained-IoT-Devices-1adbcad0aeeb8005b9a7f6eee61ec803?pvs=4',
        isHot: false,
        image_url: '/images/assets/IotDevices-framework.png',
        type: 'article',
        description:
          'Our engineering team developed a custom WebGL rendering pipeline that optimizes for memory constraints on IoT gateways. We solved the challenge of handling heterogeneous sensor data by creating an adaptive schema system that normalizes inputs in real-time. The solution reduced bandwidth requirements by 86% while improving visual responsiveness for critical monitoring applications.',
        cta_text: 'View Case Study',
      },{
        title: 'Threejs-Based AR Product Configurator',
        link: 'https://cobalt-act-e19.notion.site/High-Performance-3D-Product-Configurator-with-Three-js-1adbcad0aeeb80d9a11cd58c71aea9cd?pvs=4',
        isHot: false,
        image_url: '/images/assets/threeDproduct.jpeg',
        type: 'article',
        description:
          'Our frontend team developed a WebGL rendering system that displays photorealistic 3D models with dynamic material and component swapping. We solved the challenge of mobile performance by implementing a progressive mesh loading system that adapts detail levels based on device capabilities. The solution increased product customization engagement by 218% and reduced 3D model loading times from 12 seconds to under 2 seconds.',
        cta_text: 'View Case Study', 
      },
    ],
  },
];
