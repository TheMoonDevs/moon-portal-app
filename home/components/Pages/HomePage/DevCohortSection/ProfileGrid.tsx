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
    name: 'Subhakar T.',
    avatar: '/images/profiles/subhakar.png',
    experience: '30+ Enterprise Solutions',
    domain: 'Fullstack',
    position: 'Fractional CTO',
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
        link: 'https://karcreativeworks.com/jingle-fm-webapp',
      },
    ],
  },
  {
    name: 'Jane Smith',
    avatar: '/images/profiles/jane.png',
    experience: '25+ FinTech Products',
    domain: 'Fullstack',
    position: 'Backend Dev',
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
    experience: '15+ Digital Products',
    domain: 'Frontend',
    position: 'UX/UI Engineer',
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
    experience: '18+ Immersive Apps',
    domain: '3js Expert',
    position: 'Hybrid App Developer',
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
    experience: '7+ AI Solutions',
    domain: 'LLM & Generative AI',
    position: 'AI Systems Architect',
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
    experience: '24+ Cloud Solutions',
    domain: 'Cloud solutions',
    position: 'DevOps Engineer',
    publications: [
      {
        image_url: '/images/profiles/blockchain-cicd.png',
        type: 'article',
        title: 'Decentralized Devops - blockchain powered CI/CD',
        description:
          'Deep dive into building a next-level approach to secure CI/CD with blockchain. When you have teams spread across multiple organizations or countries, keeping everything centralized just does no  t cut it anymore.',
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
  {
    name: 'Aisha R.',
    avatar: '/images/profiles/aisha-n.png',
    experience: '9+ AI Systems',
    domain: 'Fullstack',
    position: 'AI Systems Architect',
    publications: [
      {
        image_url: '/images/assets/mlAutonomousPipeline.png',
        type: 'article',
        title: 'Autonomous ML Pipeline Creator',
        description:
          'Designed a system that analyzes dataset characteristics and automatically constructs optimal machine learning pipelines, reducing model development time by 78%.',
        link: '',
      },
      {
        image_url: '/images/assets/blockchainIdentityVerificationFramework.png',
        type: 'article',
        title: 'Blockchain Identity Verification Framework',
        description:
          'A zero-knowledge proof system that verifies identity credentials without exposing personal data, now used by three financial institutions.',
        link: '',
      },
      {
        image_url: '/images/assets/web3GovernanceDash.webp',
        type: 'article',
        title: 'Web3 Governance Dashboard',
        description:
          'Real-time visualization of DAO proposals with sentiment analysis and voting pattern recognition.',
        link: '',
      },
      {
        image_url: '/images/assets/neuralSearch.png',
        type: 'article',
        title: 'Neural Search for Enterprise Knowledge',
        description:
          'Implemented semantic search across previously siloed enterprise data, achieving 98% accuracy in retrieving relevant information compared to keyword search.',
        link: '',
      },
    ],
  },
  {
    name: 'Marcus L.',
    avatar: '/images/profiles/marcus.jpeg',
    experience: '15+ DeFi Protocols',
    domain: 'Web3',
    position: 'Smart Contract Specialist',
    publications: [
      {
        image_url: '/images/assets/defiRiskManagment.png',
        type: 'article',
        title: 'DeFi Risk Assessment Protocol',
        description:
          'Created an on-chain system that quantifies risk exposure across lending platforms, preventing $4.2M in potential losses during the 2023 market downturn.',
        link: '',
      },
      {
        image_url: '/images/assets/58fc7692-dbb2-4ef6-ac55-8fe3faff571e_2647x1584.webp',
        type: 'article',
        title: 'NFT Royalty Distribution System',
        description:
          'Built a gas-efficient solution for automatic royalty payments to multiple creators with transparent revenue splitting.',
        link: '',
      },
      {
        image_url: '/images/assets/crossChain.webp',
        type: 'article',
        title: 'Cross-Chain Asset Bridge',
        description:
          'Designed a secure bridge using atomic swaps to transfer assets between major blockchains without centralized intermediaries.',
        link: '',
      },
      {
        image_url: '/images/assets/daoTreasury.webp',
        type: 'article',
        title: 'DAO Treasury Management Suite',
        description:
          'Developed tools for decentralized budget allocation with quadratic voting, now used by 6 DAOs with combined treasuries of over $40M.',
        link: '',
      },
    ],
  },
  {
    name: 'Elena V.',
    avatar: '/images/profiles/elenaV.jpeg',
    experience: '8+ ML Solutions',
    domain: 'AI/ML',
    position: 'Neural Architecture Design',
    publications: [
      {
        image_url: '/images/assets/medicalDash-n.png',
        type: 'article',
        title: 'Computer Vision for Medical Diagnostics',
        description:
          'Trained custom neural network architectures achieving 94% accuracy in early-stage disease detection, currently in clinical trials at three major hospitals.',
        link: '',
      },
      {
        image_url: '/images/assets/aiInEcom.png',
        type: 'article',
        title: 'Reinforcement Learning for Supply Chain',
        description:
          'Built an adaptive system for e-commerce inventory management that reduced costs by 23% while maintaining optimal stock levels.',
        link: '',
      },
      {
        image_url: '/images/assets/genAIManufacturing.png',
        type: 'article',
        title: 'Generative Design for Manufacturing',
        description:
          'Created an AI system that produces optimized industrial component designs, reducing material usage by 31% while maintaining structural integrity.',
        link: '',
      },
      {
        video_url: '/images/profiles/sentiment-analysis.mp4',
        type: 'article',
        title: 'Multi-modal Sentiment Analysis',
        description:
          'Developed a system that simultaneously analyzes text, voice, and facial expressions for accurate emotion recognition in customer service applications.',
        link: '',
      },
    ],
  },
  {
    name: 'Jamal K.',
    avatar: '/images/profiles/jamalK.png',
    experience: '22+ AR/VR Apps',
    domain: 'Mobile',
    position: 'AR/VR Experience Developer',
    publications: [
      {
        image_url: '/images/assets/spatialComputing.webp',
        type: 'article',
        title: 'Spatial Computing for Retail',
        description:
          'Developed a virtual try-on system deployed in 12 retail locations, increasing conversion rates by 34% and reducing returns by 27%.',
        link: '',
      },
      {
        image_url: '/images/assets/arVrApp.png',
        type: 'article',
        title: 'AR Navigation for Indoor Spaces',
        description:
          'Created a mapping system using visual SLAM that works without GPS, achieving 98.5% accurate positioning in complex buildings.',
        link: '',
      },
    ],
  },
  {
    name: 'Sarah T.',
    avatar: '/images/profiles/sarah.jpeg',
    experience: '35+ Scalable Systems',
    domain: 'Fullstack',
    position: 'Systems Engineer',
    publications: [
      {
        image_url: '',
        type: 'article',
        title: 'Event-Driven Microservices Framework',
        description:
          'Architected a system handling 15,000+ transactions per second with automatic scaling, deployed across three unicorn startups.',
        link: '',
      },
      {
        image_url: '/images/assets/analyticsPipeline.jpg',
        type: 'article',
        title: 'Real-time Analytics Pipeline',
        description:
          'Built a streaming data platform that reduced insight latency from hours to seconds for a fintech with 2M+ daily users.',
        link: '',
      },
      {
        image_url: '/images/assets/edgeTech.webp',
        type: 'article',
        title: 'Edge Computing Network',
        description:
          'Developed a distributed system that processes IoT data at the source, reducing bandwidth requirements by 94% while increasing response times.',
        link: '',
      },
      {
        image_url: '/images/assets/multiRegionDB.jpg',
        type: 'article',
        title: 'Multi-region Database Synchronization',
        description:
          'Created a solution maintaining ACID compliance across global data centers with sub-100ms synchronization, powering a SaaS with users in 43 countries.',
        link: '',
      },
    ],
  },
  {
    name: 'Raj P.',
    avatar: '/images/profiles/rajP.png',
    experience: '13+ Blockchain Protocols',
    domain: 'Blockchain',
    position: 'Protocol Developer',
    publications: [
      {
        image_url: '',
        type: 'article',
        title: 'Layer 2 Scaling Solution',
        description:
          'Built a system increasing Ethereum transaction throughput by 200x while maintaining full security guarantees through innovative rollup technology.',
        link: '',
      },
      {
        video_url: '',
        type: 'article',
        title: 'Zero-Knowledge Proof Implementation',
        description:
          'Created privacy-preserving verification for sensitive transactions with proof generation optimized for mobile devices.',
        link: '',
      },
      {
        image_url: '',
        type: 'article',
        title: 'Consensus Algorithm Optimization',
        description:
          'Developed a hybrid consensus mechanism reducing energy use by 92% while maintaining Byzantine fault tolerance in high-value environments.',
        link: '',
      },
      {
        video_url: '',
        type: 'article',
        title: 'Cross-Protocol Interoperability Layer',
        description:
          'Engineered a translation layer allowing 7 different blockchains to communicate securely, now processing $12M in daily cross-chain volume.',
        link: '',
      },
    ],
  },
  {
    name: 'Mei L.',
    avatar: '/images/profiles/mei.jpeg',
    experience: '14+ NLP Solutions',
    domain: 'AI',
    position: 'Natural Language Processing Expert',
    publications: [
      {
        image_url: '/images/profiles/chatbot.webp',
        type: 'article',
        title: 'Context-Aware Chatbot Framework',
        description:
          'Developed an AI system that maintains conversation history with 89% relevance over extended interactions, powering customer service for 3 Fortune 500 companies.',
        link: '',
      },
      {
        video_url: '/images/profiles/multilingual.mp4',
        type: 'article',
        title: 'Multilingual Content Generation',
        description:
          'Created a system producing native-quality content in 14 languages, now generating 30,000+ product descriptions daily for an e-commerce platform.',
        link: '',
      },
      {
        image_url: '/images/profiles/document-intelligence.avif',
        type: 'article',
        title: 'Document Intelligence Platform',
        description:
          'Built an AI that extracts structured data from unstructured documents with 96% accuracy, processing 1.2M pages daily for a legal tech startup.',
        link: '',
      },
      {
        video_url: '/images/profiles/voice-interface.mp4',
        type: 'article',
        title: 'Voice Interface Design System',
        description:
          'Engineered conversational patterns that increased user retention by 42% for a health coaching app, with 78% of users preferring voice to text input.',
        link: '',
      },
    ],
  },
  {
    name: 'Xavier B.',
    avatar: '/images/profiles/xavier.png',
    experience: '31+ DevOps Solutions',
    domain: 'DevOps',
    position: 'Infrastructure Automation',
    publications: [
      {
        image_url: '/images/profiles/self-healing.webp',
        type: 'article',
        title: 'Self-Healing Cloud Architecture',
        description:
          'Designed systems with 99.99% uptime that automatically remediate failures, reducing critical incidents by 86% for a fintech processing $2B annually.',
        link: '',
      },
      {
        video_url: '/images/profiles/gitops.mp4',
        type: 'article',
        title: 'GitOps Deployment Pipeline',
        description:
          'Built a zero-touch continuous deployment system with automatic rollbacks, enabling 200+ production deployments weekly with zero downtime.',
        link: '',
      },
      {
        image_url: '/images/profiles/immutable-infra.avif',
        type: 'article',
        title: 'Immutable Infrastructure Framework',
        description:
          'Created a system that rebuilds environments from scratch on every update, eliminating configuration drift and reducing security vulnerabilities by 73%.',
        link: '',
      },
      {
        video_url: '/images/profiles/cost-optimization.mp4',
        type: 'article',
        title: 'Cost Optimization Engine',
        description:
          'Engineered systems automatically discovering optimal model structures, reducing compute costs by 68% while improving accuracy by 7%.',
        link: '',
      },
    ],
  },
  {
    name: 'Zara H.',
    avatar: '/images/profiles/zara.jpeg',
    experience: '12+ Token Systems',
    domain: 'Web3',
    position: 'Tokenomics Designer',
    publications: [
      {
        image_url: '/images/profiles/incentive-protocol.webp',
        type: 'article',
        title: 'Incentive Alignment Protocol',
        description:
          'Designed economic models that aligned stakeholder interests across platforms, increasing protocol retention by 46% and reducing exploitative behaviors.',
        link: '',
      },
      {
        video_url: '/images/profiles/token-distribution.mp4',
        type: 'article',
        title: 'Token Distribution Mechanism',
        description:
          'Created fair launch systems preventing whale accumulation, resulting in a Gini coefficient of 0.37 compared to the industry average of 0.84.',
        link: '',
      },
      {
        image_url: '/images/profiles/staking-rewards.avif',
        type: 'article',
        title: 'Staking Reward Optimization',
        description:
          'Developed models balancing network security with sustainable inflation, now implemented by 4 major DeFi protocols with $1.2B in TVL.',
        link: '',
      },
      {
        video_url: '/images/profiles/treasury-diversification.mp4',
        type: 'article',
        title: 'DAO Treasury Diversification',
        description:
          'Built algorithms for optimal portfolio management of protocol reserves, maintaining operational runway through multiple market cycles.',
        link: '',
      },
    ],
  },
  {
    name: 'Theo M.',
    avatar: '/images/profiles/theo-n.png',
    experience: '27+ UI/UX Products',
    domain: 'Frontend',
    position: 'UI/UX Engineering Lead',
    publications: [
      {
        image_url: '/images/profiles/micro-interactions.webp',
        type: 'article',
        title: 'Micro-Interaction Design System',
        description:
          'Created component libraries that increased user engagement metrics by 28% across multiple SaaS products through subtle, meaningful feedback animations.',
        link: '',
      },
      {
        video_url: '/images/profiles/accessibility.mp4',
        type: 'article',
        title: 'Accessibility-First Framework',
        description:
          'Developed interfaces achieving WCAG AAA compliance without design compromises, now used by government agencies serving 30M+ citizens.',
        link: '',
      },
      {
        image_url: '/images/profiles/performance-toolkit.avif',
        type: 'article',
        title: 'Performance Optimization Toolkit',
        description:
          'Created techniques reducing load times by 76% on mobile networks, resulting in 23% conversion rate improvement for an e-commerce platform.',
        link: '',
      },
      {
        video_url: '/images/profiles/state-management.mp4',
        type: 'article',
        title: 'State Management Architecture',
        description:
          'Engineered a reactive system simplifying complex UI data flows, reducing lines of code by 42% while improving runtime performance.',
        link: '',
      },
    ],
  },
  {
    name: 'Kenji T.',
    avatar: '/images/profiles/kenjiT-n.png',
    experience: '14+ Crypto Systems',
    domain: 'Blockchain',
    position: 'Cryptography Specialist',
    publications: [
      {
        image_url: '/images/profiles/threshold-signatures.webp',
        type: 'article',
        title: 'Threshold Signature Scheme',
        description:
          'Created multi-party signing protocols eliminating single points of failure, securing over $350M in digital assets across multiple protocols.',
        link: '',
      },
      {
        video_url: '/images/profiles/post-quantum.mp4',
        type: 'article',
        title: 'Post-Quantum Blockchain Security',
        description:
          'Developed cryptographic systems resistant to quantum computing attacks, future-proofing a blockchain handling $12B in assets.',
        link: '',
      },
      {
        image_url: '/images/profiles/zk-authentication.avif',
        type: 'article',
        title: 'Zero-Knowledge Authentication',
        description:
          'Built passwordless login without exposing identifiable information, now used by 3 financial institutions for sensitive client access.',
        link: '',
      },
      {
        video_url: '/images/profiles/secure-computation.mp4',
        type: 'article',
        title: 'Secure Multi-Party Computation',
        description:
          'Engineered systems processing sensitive data without revealing inputs, enabling collaborative fraud detection across competing banks.',
        link: '',
      },
    ],
  },
  {
    name: 'Leila H.',
    avatar: '/images/profiles/Leila.jpeg',
    experience: '11+ Edge AI Solutions',
    domain: 'AI',
    position: 'Edge AI Specialist',
    publications: [
      {
        image_url: '/images/profiles/ondevice-nlp.webp',
        type: 'article',
        title: 'On-Device NLP Processing',
        description:
          'Built language understanding systems running offline on mobile devices, enabling functionality in areas with limited connectivity.',
        link: '',
      },
      {
        video_url: '/images/profiles/tiny-ml.mp4',
        type: 'article',
        title: 'Tiny Machine Learning Framework',
        description:
          'Created ML models optimized for microcontrollers and IoT devices, reducing power consumption by 84% while maintaining 92% accuracy.',
        link: '',
      },
      {
        image_url: '/images/profiles/federated-learning.avif',
        type: 'article',
        title: 'Privacy-Preserving AI',
        description:
          'Developed federated learning systems keeping data on user devices, now deployed across medical applications with 400,000+ users.',
        link: '',
      },
      {
        video_url: '/images/profiles/realtime-vision.mp4',
        type: 'article',
        title: 'Real-time Computer Vision',
        description:
          'Engineered visual recognition achieving 30fps on low-power hardware, enabling augmented reality applications on 5-year-old smartphones.',
        link: '',
      },
    ],
  },
  {
    name: 'Dominic F.',
    avatar: '/images/profiles/dominic-n.png',
    experience: '28+ Web3 Projects',
    domain: 'Blockchain',
    position: 'Smart Contract Architect',
    publications: [
      {
        image_url: '/images/profiles/programmable-nft.webp',
        type: 'article',
        title: 'Programmable Digital Asset Framework',
        description:
          'Designed systems enabling interactive and evolving NFT experiences, powering digital collectibles with over $28M in trading volume.',
        link: '',
      },
      {
        video_url: '/images/profiles/decentralized-storage.mp4',
        type: 'article',
        title: 'Decentralized Storage Integration',
        description:
          'Created persistent metadata solutions for digital collectibles, ensuring asset longevity for collections valued at over $150M.',
        link: '',
      },
      {
        image_url: '/images/profiles/royalty-enforcement.avif',
        type: 'article',
        title: 'Royalty Enforcement Protocol',
        description:
          'Developed mechanisms ensuring creator compensation across marketplaces, generating $3.2M in sustainable royalties for artists.',
        link: '',
      },
      {
        video_url: '/images/profiles/generative-art.mp4',
        type: 'article',
        title: 'On-Chain Generative Art Engine',
        description:
          'Built systems producing unique assets through deterministic algorithms, creating 10,000+ unique artworks for a prominent NFT collection.',
        link: '',
      },
    ],
  },
  {
    name: 'Sophia W.',
    avatar: '/images/profiles/sophia-n.png',
    experience: '24+ Mobile Apps',
    domain: 'Mobile',
    position: 'Cross-Platform Architecture',
    publications: [
      {
        image_url: '/images/profiles/shared-logic.webp',
        type: 'article',
        title: 'Shared Business Logic Framework',
        description:
          'Developed systems reusing 85% of code across iOS, Android, and Web, reducing development time by 62% for a fintech with 700,000+ users.',
        link: '',
      },
      {
        video_url: '/images/profiles/native-bridge.mp4',
        type: 'article',
        title: 'Native Feature Bridge',
        description:
          'Created interfaces accessing platform capabilities from shared codebase, maintaining native performance while unifying development.',
        link: '',
      },
      {
        image_url: '/images/profiles/unified-testing.avif',
        type: 'article',
        title: 'Unified Testing Strategy',
        description:
          'Built automation covering all platforms from a single test suite, increasing test coverage by 47% while reducing QA time by 58%.',
        link: '',
      },
      {
        video_url: '/images/profiles/design-system.mp4',
        type: 'article',
        title: 'Design System Implementation',
        description:
          'Engineered component libraries maintaining brand consistency across devices, enabling a team of 14 developers to ship features 3x faster.',
        link: '',
      },
    ],
  },
  {
    name: 'Ibrahim A.',
    avatar: '/images/profiles/ibrahim-n.png',
    experience: '32+ Data Solutions',
    domain: 'Fullstack',
    position: 'Data Engineering Lead',
    publications: [
      {
        image_url: '/images/profiles/event-streaming.webp',
        type: 'article',
        title: 'Event Streaming Architecture',
        description:
          'Built systems processing billions of events daily with sub-second latency, powering real-time analytics for a social platform with 12M DAU.',
        link: '',
      },
      {
        video_url: '/images/profiles/data-lake.mp4',
        type: 'article',
        title: 'Data Lake Optimization',
        description:
          'Created storage structures reducing query times from minutes to milliseconds, enabling interactive analytics on 12PB of historical data.',
        link: '',
      },
      {
        image_url: '/images/profiles/etl-pipeline.avif',
        type: 'article',
        title: 'ETL Pipeline Automation',
        description:
          'Developed self-maintaining data flows with automatic schema evolution, reducing data engineering overhead by 76% for a growing startup.',
        link: '',
      },
      {
        video_url: '/images/profiles/analytical-database.mp4',
        type: 'article',
        title: 'Analytical Database Design',
        description:
          'Engineered data models enabling real-time business intelligence, reducing report generation time from hours to seconds for an e-commerce platform.',
        link: '',
      },
    ],
  },
  {
    name: 'Rina S.',
    avatar: '/images/profiles/rina-n.png',
    experience: '12+ AI Implementations',
    domain: 'AI',
    position: 'Generative AI Specialist',
    publications: [
      {
        image_url: '/images/profiles/creative-assistance.webp',
        type: 'article',
        title: 'Creative Assistance Platform',
        description:
          'Developed AI systems enhancing human creativity in design workflows, reducing production time by 47% for a major creative agency.',
        link: '',
      },
      {
        video_url: '/images/profiles/synthetic-data.mp4',
        type: 'article',
        title: 'Synthetic Data Generation',
        description:
          'Created realistic training datasets for sensitive domains like healthcare, enabling ML development while maintaining patient privacy.',
        link: '',
      },
      {
        image_url: '/images/profiles/text-to-image.avif',
        type: 'article',
        title: 'Text-to-Image Optimization',
        description:
          'Built fine-tuning techniques for domain-specific visual generation, achieving 94% user preference over generic models for e-commerce.',
        link: '',
      },
      {
        video_url: '/images/profiles/architecture-search.mp4',
        type: 'article',
        title: 'Neural Network Architecture Search',
        description:
          'Engineered systems automatically discovering optimal model structures, reducing compute costs by 68% while improving accuracy by 7%.',
        link: '',
      },
    ],
  },
  {
    name: 'Gabriel O.',
    avatar: '/images/profiles/gabriel-n.png',
    experience: '12+ DeFi Protocols',
    domain: 'Web3',
    position: 'Layer 1 Protocol Engineer',
    publications: [
      {
        image_url: '/images/profiles/consensus-algorithm.webp',
        type: 'article',
        title: 'Consensus Algorithm Design',
        description:
          'Created novel approaches balancing security, decentralization, and scalability, enabling 3,800 transactions per second on a public blockchain.',
        link: '',
      },
      {
        video_url: '/images/profiles/vm-optimization.mp4',
        type: 'article',
        title: 'Blockchain Virtual Machine Optimization',
        description:
          'Built execution environments reducing computational overhead by 67%, decreasing gas costs for complex operations by 42%.',
        link: '',
      },
      {
        image_url: '/images/profiles/sharding.avif',
        type: 'article',
        title: 'Sharding Implementation',
        description:
          'Developed horizontal scaling techniques increasing throughput by 150x while maintaining security guarantees and decentralization.',
        link: '',
      },
      {
        video_url: '/images/profiles/validator-economics.mp4',
        type: 'article',
        title: 'Validator Economics Framework',
        description:
          'Designed incentive systems preventing centralization of network power, achieving Nakamoto Coefficient of 42 compared to industry average of 5.',
        link: '',
      },
    ],
  },
  {
    name: 'Zoe L.',
    avatar: '/images/profiles/zoeL.png',
    experience: '19+ Enterprise Apps',
    domain: 'Frontend',
    position: 'Accessibility Specialist',
    publications: [
      {
        image_url: '/images/profiles/screen-reader.webp',
        type: 'article',
        title: 'Screen Reader Optimization',
        description:
          'Created interfaces providing rich experiences for visually impaired users, increasing accessibility score from 64% to 100% for a government service.',
        link: '',
      },
      {
        video_url: '/images/profiles/keyboard-navigation.mp4',
        type: 'article',
        title: 'Keyboard Navigation Framework',
        description:
          'Developed systems enabling complete product usage without a mouse, implemented across a SaaS platform serving 230,000+ users.',
        link: '',
      },
      {
        image_url: '/images/profiles/cognitive-load.avif',
        type: 'article',
        title: 'Cognitive Load Reduction',
        description:
          'Built interfaces simplifying complex workflows for neurodivergent users, increasing task completion rates by 46% for an educational platform.',
        link: '',
      },
      {
        video_url: '/images/profiles/inclusive-design.mp4',
        type: 'article',
        title: 'Inclusive Design System',
        description:
          'Created components exceeding accessibility requirements by default, adopted by 7 startups serving combined 3.2M users.',
        link: '',
      },
    ],
  },
  {
    name: 'Mateo R.',
    avatar: '/images/profiles/mateo-n.png',
    experience: '18+ Security Solutions',
    domain: 'Fullstack',
    position: 'Security Architecture',
    publications: [
      {
        image_url: '/images/profiles/zero-trust.webp',
        type: 'article',
        title: 'Zero-Trust Implementation',
        description:
          'Designed authentication systems verifying every request regardless of source, reducing security incidents by 97% for a healthcare platform.',
        link: '',
      },
      {
        video_url: '/images/profiles/secrets-management.mp4',
        type: 'article',
        title: 'Secrets Management Framework',
        description:
          'Built infrastructure eliminating hardcoded credentials throughout systems, now securing sensitive information for 14 financial startups.',
        link: '',
      },
      {
        image_url: '/images/profiles/pentesting-automation.avif',
        type: 'article',
        title: 'Penetration Testing Automation',
        description:
          'Created continuous security validation integrated into development pipeline, identifying 231 potential vulnerabilities before deployment.',
        link: '',
      },
      {
        video_url: '/images/profiles/incident-response.mp4',
        type: 'article',
        title: 'Security Incident Response',
        description:
          'Engineered systems detecting and mitigating attacks in real-time, reducing breach impact window from hours to minutes for critical infrastructure.',
        link: '',
      },
    ],
  },
  {
    name: 'Hana K.',
    avatar: '/images/profiles/hana-n.png',
    experience: '10+ years, 20+ Startups',
    domain: 'AI',
    position: 'Ethical AI Governance',
    publications: [
      {
        image_url: '/images/profiles/bias-detection.webp',
        type: 'article',
        title: 'Bias Detection Framework',
        description:
          'Created systems identifying and mitigating unwanted patterns in AI outputs, implemented by 3 major financial institutions for fair lending decisions.',
        link: '',
      },
      {
        video_url: '/images/profiles/model-explainability.mp4',
        type: 'article',
        title: 'Model Explainability Tools',
        description:
          'Built interfaces making AI decision-making transparent to users, increasing trust metrics by 42% for a healthcare diagnostic tool.',
        link: '',
      },
      {
        image_url: '/images/profiles/data-collection.avif',
        type: 'article',
        title: 'Responsible Data Collection',
        description:
          'Developed protocols ensuring consent and privacy in training datasets, now adopted as standard by an AI consortium representing 28 companies.',
        link: '',
      },
      {
        video_url: '/images/profiles/impact-assessment.mp4',
        type: 'article',
        title: 'AI Impact Assessment',
        description:
          'Designed frameworks evaluating potential consequences of AI deployments, preventing negative outcomes for systems affecting 2M+ people.',
        link: '',
      },
    ],
  },
  {
    name: 'Niklas B.',
    avatar: '/images/profiles/niklas-n.png',
    experience: '11+ years, 22+ Startups',
    domain: 'Web3',
    position: 'Oracle Infrastructure',
    publications: [
      {
        image_url: '/images/profiles/data-feeds.webp',
        type: 'article',
        title: 'Decentralized Data Feeds',
        description:
          'Built systems bringing off-chain information on-chain with cryptographic proofs, now securing $1.7B in DeFi positions with reliable price data.',
        link: '',
      },
      {
        video_url: '/images/profiles/verifiable-random.mp4',
        type: 'article',
        title: 'Verifiable Random Function',
        description:
          'Created provably fair randomness for games and selection processes, powering transparent lotteries with combined prize pools of $28M.',
        link: '',
      },
      {
        image_url: '/images/profiles/cross-chain-data.avif',
        type: 'article',
        title: 'Cross-Chain Data Bridge',
        description:
          'Developed mechanisms synchronizing state across independent blockchains, enabling composable applications across 6 major ecosystems.',
        link: '',
      },
      {
        video_url: '/images/profiles/asset-tokenization.mp4',
        type: 'article',
        title: 'Real-World Asset Tokenization',
        description:
          'Built systems connecting physical assets to on-chain representations, enabling fractional ownership of $42M in commercial real estate.',
        link: '',
      },
    ],
  }
]
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
