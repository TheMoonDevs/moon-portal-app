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
        link: 'https://portal.themoondevs.com/user/worklogs',
        isHot: false,
        image_url: '/images/assets/gen-ai-image.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
        cta_text: 'Try Demo',
      },
      {
        title: 'Dynamic SEO & link previews based on AI',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
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
      },
    ],
  },
  {
    industry: 'SaaS',
    projects: [
      {
        title: 'AR 3d model placements in React Native App',
        link: '',
        isHot: false,
        image_url: '/images/assets/0_wU7J4l4ewkW2KRzB.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Integrating live collaboration (like figma)',
        link: '',
        isHot: true,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Slack, Discord, Twitter Bots for Internal updates',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Predictive analytics & AI-powered dashboards',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Ecommerce RAG based Framework',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Workplace tools for enterprises',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'webRTC based live streaming meets',
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
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Biometric & Passkey Authentications',
        link: '',
        isHot: true,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
    ],
  },
  {
    industry: 'Misc',
    projects: [
      {
        title: 'Threejs based virtual product view',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'DevOps setup for private repos deployed on VPS',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Telegram Mini Apps',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Unity + Photon Multiplayer Games',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'Unity + Photon Multiplayer Games',
        link: '',
        isHot: false,
        image_url: '/images/abstract-red.png',
        type: 'article',
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
    ],
  },
];
