import { IPublication } from '@/components/App/PublicationDialog';

export interface IProjects extends IPublication {
  isHot?: boolean;
}
export interface IIndustryAndProjects {
  industry: string;
  projects: IProjects[];
}

export const projectsData: IIndustryAndProjects[] = [
  {
    industry: 'Crypto',
    projects: [
      {
        title: 'BoB based gaming web3 competitions',
        link: 'https://play.google.com/store/apps/details?id=com.earnalliance.app&hl=en_IN&pli=1',
        isHot: false,
        image_url: '/images/assets/web3Game-n.png',
        type: 'article',
        stats: [
          {
            value: '500k+',
            description: 'Monthly Active Users',
          },
          {
            value: '$2.5M',
            description: 'Trading Volume',
          },
        ],

        description:
          'Architected from the ground up with battle-tested smart contracts and a gamer-first UX, we sculpted BoB competitions through rapid prototyping, community-driven iterations, and blockchain innovation that prioritizes transparency without sacrificing performance.',
       cta_text: "View App"},
      {
        title: 'Drakula | VRF based Social App',
        link: 'http://drakula.app/',
        isHot: true,
        image_url: '/images/assets/vrfBasedApp-n.webp',
        type: 'article',
        stats: [
          {
            value: '99.9%',
            description: 'Uptime',
          },
          {
            value: '2M+',
            description: 'Verifiable Transactions',
          },
        ],

        description:
          '"Engineered Drakula.app through lean methodology, building a tokenized creator economy where our dev team iteratively refined the staking mechanisms, implemented viral engagement loops, and optimized the recommendation algorithm to ensure equitable value distribution between creators and their investor communities.',
      },
      {
        title: 'Pre IPO based ERC-20 Tokens (CryptoCoin)',
        link: 'https://cobalt-act-e19.notion.site/Breaking-New-Ground-How-We-Built-Our-Pre-IPO-Tokenization-Platform-1b2bcad0aeeb803fbaade07e2d462568?pvs=4',
        isHot: false,
        image_url: '/images/assets/web3ERC20.webp',
        type: 'article',
        stats: [
          {
            value: '$50M',
            description: 'Total Value Locked',
          },
          {
            value: '45k',
            description: 'Token Holders',
          },
        ],
        description:
          'Meticulously crafted through agile development sprints, our Pre-IPO tokenization platform emerged as we stress-tested smart contract security, refined the equity-to-token conversion protocols, and sculpted an institutional-grade UI that bridges traditional finance familiarity with web3 innovation.',
        cta_text: 'View Case Study'
      },
      {
        title: 'EVM-compatible Bitcoin fork',
        link: '',
        isHot: false,
        image_url: '/images/assets/evmBitcoinFork.png',
        type: 'article',
        stats: [
          {
            value: '120k',
            description: 'Daily Transactions',
          },
          {
            value: '15s',
            description: 'Block Time',
          },
        ],
        description:
          'A lightning-fast EVM-compatible Bitcoin fork that preserves Bitcoin security model while unlocking Ethereums programmability, creating the perfect foundation for next-generation DeFi applications.',
      },
      {
        title: 'NFT & ERC-20 Platforms',
        link: '',
        isHot: false,
        image_url: '/images/assets/nftApp.webp',
        type: 'article',
        stats: [
          {
            value: '250k',
            description: 'NFTs Minted',
          },
          {
            value: '$8M',
            description: 'Trading Volume',
          },
        ],
        description:
          'Engineered NFTether through intensive development cycles, where our team pioneered a cross-standard bridge protocol that seamlessly converts between NFT and ERC-20 assets, allowing fluid value exchange while preserving the unique properties of both token frameworks.',
      },
      {
        title: 'Wallet Plugins for Browsers',
        link: 'https://cobalt-act-e19.notion.site/1b2bcad0aeeb808e9b9cea0d4199c337?pvs=4',
        isHot: false,
        image_url: '/images/assets/web3extension.png',
        type: 'article',
        stats: [
          {
            value: '180k',
            description: 'Downloads',
          },
          {
            value: '4.8',
            description: 'User Rating',
          },
        ],
        description:
          'We crafted, a sleek Web3 wallet extension that showcases our ability to blend complex blockchain functionality with intuitive UX. This isnt just another portfolio piece—its living proof of our technical depth in the decentralized space.',
        cta_text: "View Case Study"
      },
      {
        title: 'Zypto | Base Chain Wallets',
        link: 'https://zypto.com/wallet/base-chain/',
        isHot: false,
        image_url: '/images/assets/wallet-base-chain.png',
        type: 'article',
        stats: [
          {
            value: '850k',
            description: 'Network Users',
          },
          {
            value: '5000+',
            description: 'Smart Contracts',
          },
        ],
        description:
          'With Zypto’s decentralised, non-custodial Crypto App you can securely hold, send and receive many cryptocurrencies, including Base Chain. Also, discover ways to buy and spend Base Chain using integrated onramps, plus our range of Base Chain crypto cards, Base Chain gift cards, Base Chain bill payments, and more',
        cta_text: 'View App'
      },
      {
        title: 'Smart Wallet Integration (Zero Gas Fees)',
        link: '',
        isHot: true,
        image_url: '/images/assets/web3Wallet.webp',
        type: 'article',
        stats: [
          {
            value: '$2.5M',
            description: 'Gas Saved',
          },
          {
            value: '95k',
            description: 'Active Wallets',
          },
        ],
        description:
          'Zero-G Smart Wallet integration eliminates the primary barrier to Web3 adoption—gas fees. We haveve implemented account abstraction that lets users transact on-chain without ever touching ETH, making dApp interactions as frictionless as Web2.',
      },
      {
        "title": "NFT Loyalty Ecosystem",
        "link": "",
        "isHot": true,
        "image_url": "/images/assets/nftLoyaltyProgram.png",
        "type": "article",
        "stats": [
          {
            "value": "14x",
            "description": "Engagement Boost"
          },
          {
            "value": "86%",
            "description": "Retention Rate"
          }
        ],
        "description": "Dynamic NFT-based loyalty platform that evolves with user engagement, creating digital collectibles with real utility and tradable value."
      },
      {
        "title": "zkKYC Protocol",
        "link": "",
        "isHot": true,
        "image_url": "/images/assets/zkKYC-web3.webp",
        "type": "article",
        "stats": [
          {
            "value": "8sec",
            "description": "Verification Time"
          },
          {
            "value": "100%",
            "description": "Privacy Preserved"
          }
        ],
        "description": "Zero-knowledge identity verification allowing compliant DeFi access without exposing personal data, bridging TradFi requirements with Web3 privacy."
      },
      {
        "title": "Social Recovery Wallet Framework",
        "link": "",
        "isHot": true,
        "image_url": "/images/assets/web3walletRecovery.jpg",
        "type": "article",
        "stats": [
          {
            "value": "99.8%",
            "description": "Recovery Success"
          },
          {
            "value": "0",
            "description": "Seed Phrases"
          }
        ],
        "description": "Next-gen wallet security using trusted contacts for recovery instead of seed phrases, eliminating the #1 cause of lost assets."
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
        stats: [
          {
            value: '2.5M',
            description: 'Images Generated',
          },
          {
            value: '98%',
            description: 'Accuracy Rate',
          },
        ],
      },
      {
        title: 'Ecommerce Chatbot',
        link: '',
        isHot: false,
        image_url: '/images/assets/ecomChatBot.mp4',
        type: 'article',
        stats: [
          {
            value: '42%',
            description: 'Ticket Reduction',
          },
          {
            value: '85%',
            description: 'Customer Satisfaction',
          },
        ],
        description:
          'Developed a conversational AI platform that guides customers through product discovery, handles order inquiries, and provides personalized recommendations resulting in a 42% reduction in support ticket volume.',
      },
      {
        title: 'Real-Time Sentiment Analysis for Customer Support Calls',
        link: '',
        isHot: false,
        image_url: '/images/assets/Call-Sentiment-Analysis-Score.png',
        type: 'article',
        description:
          'Developed a novel audio preprocessing pipeline that maintains accuracy even with poor connection quality. Created an intervention alert system that reduced negative call outcomes by 42%  ',
        stats: [
          {
            value: '42%',
            description: 'Negative Call Reduction',
          },
          {
            value: '95%',
            description: 'Analysis Accuracy',
          },
        ],
      },
      {
        title: 'RAG-Based Voice Assistant for Industrial Equipment Manuals',
        link: 'https://www.cloudtalk.io/blog/ai-performance-evaluation/',
        isHot: false,
        image_url: '/images/assets/rag-based-image.png',
        type: 'article',
        description:
          'Engineered a custom vector database architecture that reduced query time by 78% for complex technical information.\n  Integrated with proprietary hardware interfaces that traditional LLM frameworks can not support',
        cta_text: 'View Case Study',
        stats: [
          {
            value: '78%',
            description: 'Query Time Reduction',
          },
          {
            value: '25k+',
            description: 'Daily Queries',
          },
        ],
      },
      {
        title: 'Multimodal Content Moderation for UGC Platform',
        link: '',
        isHot: false,
        image_url: '/images/assets/architecture.png',
        type: 'article',
        description:
          'Solved cross-lingual evasion tactics by implementing a semantic understanding layer that works across 14 languages. Accelerated processing time from 2.1s to 0.3s by optimizing the inference pipeline',
        stats: [
          {
            value: '14',
            description: 'Languages Supported',
          },
          {
            value: '0.3s',
            description: 'Processing Time',
          },
        ],
      },
      {
        title: 'LLM-Powered Contract Generation & Analysis',
        link: '',
        isHot: false,
        image_url: '',
        type: 'article',
        stats: [
          {
            value: '95%',
            description: 'Risk Detection Rate',
          },
          {
            value: '75%',
            description: 'Time Saved',
          },
        ],
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
        stats: [
          {
            value: '4x',
            description: 'Forecast Accuracy',
          },
          {
            value: '32%',
            description: 'Waste Reduction',
          },
        ],
      },
      {
        title: 'AI Based Language Learning Platform',
        link: 'https://www.kann.app/',
        isHot: true,
        image_url: '/images/assets/languageLearningApp.avif',
        type: 'article',
        description:
          'Created a goal-oriented learning engine that dynamically adjusts content difficulty based on individual performance metrics, reducing time-to-fluency by 32%.',
        cta_text: 'Visit Website',
        stats: [
          {
            value: '32%',
            description: 'Learning Speed Boost',
          },
          {
            value: '250k+',
            description: 'Active Learners',
          },
        ],
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
        stats: [
          {
            value: '85%',
            description: 'Load Time Reduction',
          },
          {
            value: '3M+',
            description: 'Model Renders',
          },
        ],
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
        stats: [
          {
            value: '20ms',
            description: 'Latency',
          },
          {
            value: '99.9%',
            description: 'Sync Accuracy',
          },
        ],
        description:
          'Engineered a conflict-free replicated data structure (CRDT) backend that enables sub-20ms collaborative editing with intelligent merge resolution even in high-latency environments.',
      },
      {
        title: 'Slack, Discord, Twitter Bots for Internal updates',
        link: '',
        isHot: false,
        image_url: '/images/assets/TheMoonDevs-bot-DM-TheMoonDevs-Slack-03-06-2025_02_32_PM.png',
        type: 'article',
        stats: [
          {
            value: '65%',
            description: 'Task Automation',
          },
          {
            value: '15k+',
            description: 'Daily Commands',
          },
        ],
        description:
          'Engineered a custom Discord-based workflow automation system that streamlines meeting scheduling, payment tracking, and timesheet management through a unified interface.',
      },
      {
        title: 'Predictive analytics & AI-powered dashboards',
        link: '',
        isHot: false,
        image_url: '/images/assets/Example-Output-Ask-AI.webp',
        type: 'article',
        stats: [
          {
            value: '12k+',
            description: 'Active Users',
          },
          {
            value: '47%',
            description: 'Forecast Accuracy',
          },
        ],
        description:
          'A high-performance dashboard built for managing team and projects.',
      },
      {
        title: 'Ecommerce RAG based Framework',
        link: '',
        isHot: false,
        image_url: '/images/assets/ragForEcommerce.webp',
        type: 'article',
        stats: [
          {
            value: '47%',
            description: 'Conversion Increase',
          },
          {
            value: '2.5s',
            description: 'Response Time',
          },
        ],
        description:
          'Engineered a RAG-based product discovery system that combines visual recognition with contextual understanding to deliver hyper-personalized recommendations, increasing conversion rates by 47%.',
      },
      {
        title: 'Workplace tools for enterprises',
        link: '',
        isHot: false,
        image_url: '/images/assets/internalTools.png',
        type: 'article',
        stats: [
          {
            value: '35k+',
            description: 'Enterprise Users',
          },
          {
            value: '63%',
            description: 'Productivity Gain',
          },
        ],
        description:
          'Built an integrated team productivity platform that reduces context-switching by 63% through AI-powered workflow orchestration and cross-tool data synchronization.',
      },
      {
        title: 'webRTC based live streaming meets',
        link: 'https://cobalt-act-e19.notion.site/1aebcad0aeeb8013a858f3483a8b3f9e?pvs=4',
        isHot: false,
        image_url: '/images/assets/webRTC.webp',
        type: 'article',
        stats: [
          {
            value: '100ms',
            description: 'Max Latency',
          },
          {
            value: '99.9%',
            description: 'Uptime',
          },
        ],
        description:
          'A WebRTC-based communication system with AI-powered real-time language translation that maintains sub-100ms latency even on congested networks.',
        cta_text: 'View Case Study',
      },
      {
        title: 'FlowForge: Workflow Automation for the Modern Business',
        link: '',
        isHot: false,
        image_url: '/images/assets/flowForge.webp',
        type: 'article',
        description:
          'Automation without the engineering team. Our visual builder turns complex business processes into drag-and-drop simplicity. Users create sophisticated workflows connecting their existing tools while you watch adoption metrics climb.',
        cta_text: 'View Case Study',
        stats: [
          {
            value: '75%',
            description: 'Dev Time Saved',
          },
          {
            value: '500+',
            description: 'Active Workflows',
          },
        ],
      },
      {
        title: 'DocUSense',
        link: '',
        isHot: false,
        image_url: '/images/assets/documentReader.png',
        type: 'article',
        description:
          'Transform unstructured documents into structured gold. Our platform not just read text—it understands context, extracts relationships, and turns messy PDFs into actionable data. Perfect for startups drowning in documents but starving for insights.',
        cta_text: 'View Case Study',
        stats: [
          {
            value: '92%',
            description: 'Extraction Accuracy',
          },
          {
            value: '1M+',
            description: 'Docs Processed',
          },
        ],
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
        stats: [
          {
            value: '90%',
            description: 'Load Time Reduction',
          },
          {
            value: '4.8',
            description: 'App Store Rating',
          },
        ],
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'NFC card Authorization / Registrations',
        link: '',
        isHot: false,
        image_url: '/images/assets/nfcApp.webp',
        type: 'article',
        stats: [
          {
            value: '0.5s',
            description: 'Auth Speed',
          },
          {
            value: '99.99%',
            description: 'Security Score',
          },
        ],
        description:
          'A high-performance dashboard built for managing token holdings.',
      },
      {
        title: 'WaveConnect: Social Tracking Platform for Mariners',
        link: 'https://cobalt-act-e19.notion.site/The-Social-Navigation-Revolution-Why-Mariners-Need-Their-Own-Platform-1b0bcad0aeeb809eb7c3f066a9c25e42?pvs=4',
        isHot: false,
        image_url: '/images/assets/marineSocialApp.jpeg',
        type: 'article',
        stats: [
          {
            value: '50k+',
            description: 'Active Mariners',
          },
          {
            value: '15k',
            description: 'Vessels Tracked',
          },
        ],
        description:
          'WaveConnect is a specialized social platform designed exclusively for the maritime community, combining vessel tracking technology with social networking features to create a unified experience for professional mariners, recreational boaters, and maritime enthusiasts.',
      },
      {
        title: 'HybridFlow: React Web Apps with Native Performance',
        link: 'https://cobalt-act-e19.notion.site/Beyond-PWAs-How-React-Hybrid-Apps-Are-Changing-the-Startup-Playbook-1b0bcad0aeeb80f9bde7e66945664a13?pvs=4',
        isHot: true,
        image_url: '/images/assets/reactNativeApp.png',
        type: 'article',
        stats: [
          {
            value: '95%',
            description: 'Native Performance',
          },
          {
            value: '60%',
            description: 'Dev Time Saved',
          },
        ],
        description:
          'React-based framework that enables startups to deploy web applications as native apps with near-native performance, eliminating the traditional tradeoffs between development speed and user experience.',
      },
      {
        title: 'Interactive Gesture Experiences for App',
        link: 'https://cobalt-act-e19.notion.site/Interactive-Design-Case-Study-1b0bcad0aeeb80cabdc3db12cd24a367?pvs=4',
        isHot: false,
        image_url: '/images/assets/interactiveDesign.avif',
        type: 'article',
        stats: [
          {
            value: '45%',
            description: 'Engagement Boost',
          },
          {
            value: '120fps',
            description: 'Animation Speed',
          },
        ],
        description:
          'Interactive gesture experiences transform app UIs from static interfaces into dynamic playgrounds where intuitive movements unlock delightful interactions, creating emotional connections that transform functional tasks into memorable brand moments.',
        cta_text: 'View Case Study',
      },
      {
        title: 'Contact based syncing for a Social App',
        link: 'https://cobalt-act-e19.notion.site/Reimagining-Social-Connections-Contact-Based-Syncing-for-Modern-Social-Apps-1adbcad0aeeb805088aec98ff8ebf3b6?pvs=4',
        isHot: false,
        image_url: '/images/assets/contactSync.png',
        type: 'article',
        stats: [
          {
            value: '98%',
            description: 'Match Accuracy',
          },
          {
            value: '250ms',
            description: 'Sync Speed',
          },
        ],
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
        stats: [
          {
            value: '74%',
            description: 'Faster Login',
          },
          {
            value: '99.9%',
            description: 'Security Score',
          },
        ],
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
        stats: [
          {
            value: '2.5M',
            description: '3D Renders',
          },
          {
            value: '60fps',
            description: 'Performance',
          },
        ],
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
        stats: [
          {
            value: '90%',
            description: 'Deploy Time Cut',
          },
          {
            value: '40%',
            description: 'Cost Reduction',
          },
        ],
        description:
          'Slashed deployment time by 90% while achieving zero failures, reclaiming 60+ developer hours monthly, maintaining perfect deployment reliability, and cutting infrastructure costs by 40% compared to managed cloud services.',
      },
      {
        title: 'Telegram Mini Apps',
        link: 'https://cobalt-act-e19.notion.site/Dino-Click-1adbcad0aeeb80f2a844c4c1077a0538?pvs=4',
        isHot: false,
        image_url: '/images/assets/telegramMiniApps.jpg',
        type: 'article',
        stats: [
          {
            value: '250k',
            description: 'Daily Users',
          },
          {
            value: '4.9',
            description: 'User Rating',
          },
        ],
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
        stats: [
          {
            value: '50ms',
            description: 'Network Latency',
          },
          {
            value: '100k+',
            description: 'Active Players',
          },
        ],
        description:
          'A high-performance dashboard built for managing token holdings.',
        cta_text: 'View Case Study',
      },
      {
        title: 'Real-Time Data Visualization Framework for IoT Sensors',
        link: 'https://cobalt-act-e19.notion.site/Real-Time-Visualization-Framework-for-Resource-Constrained-IoT-Devices-1adbcad0aeeb8005b9a7f6eee61ec803?pvs=4',
        isHot: false,
        image_url: '/images/assets/IotDevices-framework.png',
        type: 'article',
        stats: [
          {
            value: '86%',
            description: 'Bandwidth Saved',
          },
          {
            value: '10ms',
            description: 'Update Speed',
          },
        ],
        description:
          'Our engineering team developed a custom WebGL rendering pipeline that optimizes for memory constraints on IoT gateways. We solved the challenge of handling heterogeneous sensor data by creating an adaptive schema system that normalizes inputs in real-time. The solution reduced bandwidth requirements by 86% while improving visual responsiveness for critical monitoring applications.',
        cta_text: 'View Case Study',
      },
      {
        title: 'Threejs-Based AR Product Configurator',
        link: 'https://cobalt-act-e19.notion.site/High-Performance-3D-Product-Configurator-with-Three-js-1adbcad0aeeb80d9a11cd58c71aea9cd?pvs=4',
        isHot: false,
        image_url: '/images/assets/threeDproduct.jpeg',
        type: 'article',
        description:
          'Our frontend team developed a WebGL rendering system that displays photorealistic 3D models with dynamic material and component swapping. We solved the challenge of mobile performance by implementing a progressive mesh loading system that adapts detail levels based on device capabilities. The solution increased product customization engagement by 218% and reduced 3D model loading times from 12 seconds to under 2 seconds.',
        cta_text: 'View Case Study', 
        stats: [
          {
            value: '218%',
            description: 'Engagement Increase',
          },
          {
            value: '2s',
            description: 'Load Time',
          },
        ],
      },
    ],
  },
];
