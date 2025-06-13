import { Inter } from 'next/font/google';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const inter = Inter({ subsets: ['latin'] });

interface WorkExperience {
    title: string;
    company: string;
    period: string;
    description: string[];
    technologies: string[];
}

const workExperiences: WorkExperience[] = [
    {
        title: "Full-stack Blockchain Developer",
        company: "CHUNKSHACKLE PTE. LTD.",
        period: "2024 - 2024",
        description: [
            "Refactored a Turborepo to support modern tools like TailwindCSS, Viem, and Privy for a Base Chain dApp",
            "Integrated token/coin exchange via Uniswap V3 protocol on a Next.js-based app along with token price calculation",
            "Set up Web3 wallets, including integrating a smart wallet and injected wallet, restoring a private key-based wallet, ramping onboarding, and connecting social accounts via Privy"
        ],
        technologies: [
            "React",
            "Next.js",
            "TypeScript",
            "Front-end",
            "Tailwind CSS",
            "Web3",
            "Blockchain",
            "Cryptocurrency",
            "Vercel",
            "Full-stack",
            "Decentralized Exchanges (DEXs)"
        ]
    },
    {
        title: "Full-stack AI & eCommerce Developer",
        company: "Verneek",
        period: "2024 - 2024",
        description: [
            "Developed features for AI-based list curation, product rules, and AutoAttribute generation for an eCommerce RAG-based app",
            "Improved the UX of 30+ pages in the dashboard, with smooth transitions and quick loads",
            "Set up E2E tests with Cypress and Clerk authentication bypass. Wrote 20+ tests for entire app testing",
            "Integrated REST API endpoints for gRPC-based core library. Typed with Zod and TypeScript",
            "Added SVG-based analytics charts for merchandising dashboards based on time-sequenced data from SQL queries",
            "Worked on socket-based streaming of AI-generated stories based on selected products"
        ],
        technologies: [
            "React",
            "Node.js",
            "Next.js",
            "TypeScript",
            "JavaScript",
            "HTML",
            "CSS",
            "Scala",
            "Machine Learning",
            "AWS IAM",
            "AWS CLI",
            "Lexicata API",
            "Protobuf",
            "gRPC",
            "SVG",
            "OpenAI",
            "PostgreSQL",
            "Vercel",
            "Full-stack"
        ]
    },
    {
        title: "Full-stack Blockchain Developer",
        company: "BitcoinSKR",
        period: "2023 - 2024",
        description: [
            "Built and deployed a new Dapp for a fork-blockchain based on Bitcoin, with a full dashboard, exchange, wallet connection, etc",
            "Implemented transaction explore with decoded transactions from Etherscan APIs",
            "Implemented functionality for both non-custodial and custodial wallets, improving the effective user conversion rate and ease of sign-in"
        ],
        technologies: [
            "CSS",
            "JavaScript",
            "HTML",
            "Cryptocurrency",
            "React",
            "Node.js",
            "Blockchain & Cryptocurrency",
            "Viem",
            "Uniswap SDK",
            "Etherscan API",
            "Vercel"
        ]
    },
    {
        title: "Full-stack Web3 Developer",
        company: "BSGG Labs N.V.",
        period: "2023 - 2023",
        description: [
            "Developed and deployed a Next.js front-end application for Betswap, supporting coin migrations, bridging, exchange, and an investor dashboard, enhancing the user experience for a 10,000-strong user base",
            "Expanded data insights by integrating CoinGecko API for current prices, market cap, FDV, TVL, and historical graphs",
            "Implemented a smooth and responsive migration widget, allowing users to seamlessly transition between chains",
            "Established comprehensive testing procedures using Jest, the React Testing Library, and Cypress",
            "Successfully set up NextAuth.js for message signing, enabling secure front-end authentication",
            "Designed and implemented various dashboard components, including BSGG chart, GraphBox, and Tabs",
            "Enhanced the UI/UX with features like chain selectors, migration timers, and toast notifications",
            "Integrated KyberSwap API for buy/sell functionalities, developing a KyberSwap Widget UI"
        ],
        technologies: [
            "React",
            "Node.js",
            "GraphQL",
            "tRPC",
            "Cryptocurrency",
            "Blockchain",
            "Next.js",
            "Ethers.js",
            "Redux",
            "TypeScript",
            "Cypress",
            "Jest",
            "React Testing Library",
            "NextAuth.js",
            "Vercel",
            "Full-stack"
        ]
    },
    {
        title: "Full-stack Blockchain & AI Developer",
        company: "Asad Bangash",
        period: "2023 - 2023",
        description: [
            "Built a front-end blockchain-based application for a generative AI platform that can handle 10+ different models and generate over 999+ images per user per subscription",
            "Strengthened security measures by introducing safety checks and monitoring the use of unsafe words",
            "Refactored an existing repository to align with client requirements, utilizing Vite, React, Tailwind CSS, and Redux",
            "Designed and implemented a responsive staggered grid layout for showcasing public posts of generated images",
            "Integrated wallet connection and account subscription via smart contracts",
            "Enhanced user security by validating subscription status and wallet identity through signing messages"
        ],
        technologies: [
            "Blockchain",
            "JavaScript",
            "CSS",
            "Node.js",
            "React",
            "TypeScript",
            "Ethers.js",
            "Cryptocurrency Wallets",
            "Ethereum Smart Contracts",
            "Text to Image",
            "API Integration",
            "Vercel",
            "Full-stack",
            "Web3.js"
        ]
    },
    {
        title: "Full-stack AI & Browser Extension Developer",
        company: "Spiffy AI, Inc.",
        period: "2023 - 2023",
        description: [
            "Refactored the entire repo, enhancing its maintainability, performance, code readability, and reduced boilerplate",
            "Prevented memory leaks and improved the overall stability and performance of the application",
            "Successfully integrated AI-powered suggestions for Gmail Compose/Reply via manipulating the contentEditable DOM",
            "Implemented a smooth flow of information between injected scripts, background scripts, and browser extension popup pages",
            "Integrated analytics of the browser extension usage via Twillio Segment and Mixpanel",
            "Fixed broken UI on content pages where the injected script and React components were causing global styling issues",
            "Worked on the intricate setup of dynamic communication with a back-end AI client and front-end keystroke events via WebSocket"
        ],
        technologies: [
            "TypeScript",
            "JavaScript",
            "Node.js",
            "React",
            "Next.js",
            "Browser Plugins",
            "Firebase",
            "Chrome API",
            "HTML DOM",
            "WebSockets",
            "Segment.io",
            "Mixpanel API",
            "Chakra UI",
            "Material UI",
            "Back-end",
            "Conversions API",
            "Vercel"
        ]
    },
    {
        title: "Full-stack Web3 & Game Developer",
        company: "Wagmi Competition",
        period: "2022 - 2023",
        description: [
            "Made the entire app functional with Redux, React, and Next.js as the base stack and a complete crypto wallet-based authentication system",
            "Upgraded the user experience of the entire front end with a better and more responsive design system and 15+ reusable primary modular components",
            "Integrated and set up Cloud Firestore with email and Web3 wallet-signature-based authentication",
            "Built an HTML Canvas and SVG-based game to mark the coordinates of a scaled-down image",
            "Created scripts and an admin page for better micro-management of smart contract interactions",
            "Created a smooth workflow for a multi-step transaction that requires an allowance from ERC20",
            "Optimized the complete structure of the theme, primary components, and styling system"
        ],
        technologies: [
            "React",
            "Redux",
            "User Interface (UI)",
            "Next.js",
            "Material UI",
            "Emotion Library",
            "Firebase",
            "Cloud Firestore",
            "Smart Contracts",
            "Styled-components",
            "Google SEO",
            "Back-end",
            "Vercel"
        ]
    },
    {
        title: "Senior Front-end Developer",
        company: "Cryptostamping",
        period: "2021 - 2022",
        description: [
            "Developed a Next.js Web3 platform for a utility protocol for NFTs, styled and functioning emulated in the model of OpenSea",
            "Developed a React-based browser extension for NFT Auth and improvised the security of wallet connections",
            "Built a widget easy to customize and embed for third-party developers, turning their Web2 app into Web3",
            "Worked on EVM chains (Ethereum, Polygon, Binance, AVAX) and smart contracts",
            "Developed a blockchain explorer like Etherscan for all registered NFT collections and stampings",
            "Led and coordinated a team of three developers in building, reviewing, and deploying all front-end application parts",
            "Migrated the entire code repository of a Next.js app to TypeScript",
            "Added unit tests for reusable Web3 components of the app"
        ],
        technologies: [
            "React",
            "Next.js",
            "Ethers.js",
            "Cryptocurrency Wallets",
            "Ethereum Smart Contracts",
            "UI Design",
            "Node.js",
            "HTML5",
            "CSS",
            "JavaScript",
            "Web Development",
            "APIs",
            "Responsive UI",
            "User Interface (UI)",
            "Front-end Development",
            "REST APIs",
            "Single-page Applications (SPAs)",
            "HTML DOM",
            "DigitalOcean",
            "TypeScript",
            "JSON",
            "Responsive Web Apps",
            "Front-end",
            "Websites",
            "Development",
            "Prisma",
            "IPFS",
            "Chrome Extensions",
            "Jest",
            "Blockchain",
            "MetaMask",
            "Abis",
            "Back-end",
            "Vercel",
            "Full-stack",
            "Web3.js"
        ]
    },
    {
        title: "Full-stack Developer",
        company: "TheMoonDevs",
        period: "2020 - 2022",
        description: [
            "Developed a React Native mobile app that lets users connect or share links with strangers via a QR code",
            "Delivered a fantastic front end (React web app) for a multiplayer Unity 2D game",
            "Developed a Unity 3D game with the new input system, HDR pipeline, dynamic render effects, and a custom-built HTTP request handler",
            "Integrated Google Cloud Text-to-Speech to a back-end REST API for a dynamic on-demand voice-over for a game"
        ],
        technologies: [
            "React",
            "Next.js",
            "React Native",
            "WebGL",
            "Unity",
            "JavaScript",
            "Express.js",
            "Google Cloud",
            "Text to Speech (TTS)",
            "QR Codes",
            "Expo",
            "Expo.io",
            "Android",
            "iOS",
            "DigitalOcean",
            "TypeScript",
            "JSON",
            "Responsive Web Apps",
            "Front-end",
            "Websites",
            "Development",
            "Unity2D",
            "C#",
            "Google Analytics 4",
            "Back-end",
            "API Integration",
            "Vercel",
            "Full-stack"
        ]
    },
    {
        title: "Front-end Developer and UX Designer",
        company: "JingleFM",
        period: "2020 - 2021",
        description: [
            "Developed the front-end of a podcast search engine that can search over 2,000,000 titles with diverse filters",
            "Improved the page performance of server-rendered pages, which can be as fast as 100 milliseconds",
            "Optimized the SEO for popular web crawler standards by implementing the structured JSON-LD format",
            "Delivered a smooth and clutter-free UI that can handle large data sets using list virtualization",
            "Developed a custom audio player similar to Spotify that generates dynamic waveforms",
            "Produced complete documentation that includes app-level docs and code comments",
            "Designed a complete mockup of the app with 20+ screens, 40+ design components, and 300+ design resources",
            "Delivered a responsive web app for all screen sizes that supported all modern browsers",
            "Integrated Google Analytics for the overall web app metrics"
        ],
        technologies: [
            "React",
            "Next.js",
            "UI Design",
            "SEO Tools",
            "HTML5 Canvas",
            "Node.js",
            "HTML5",
            "CSS",
            "JavaScript",
            "Web Development",
            "APIs",
            "Responsive UI",
            "User Interface (UI)",
            "Front-end Development",
            "REST APIs",
            "User Experience (UX)",
            "Single-page Applications (SPAs)",
            "HTML DOM",
            "Amazon Web Services (AWS)",
            "JSON",
            "Responsive Web Apps",
            "Front-end",
            "Websites",
            "Development",
            "Google Analytics",
            "Google SEO",
            "Google Analytics 4"
        ]
    },
    {
        title: "UI Designer",
        company: "CrashAd",
        period: "2019 - 2019",
        description: [
            "Designed an interactive prototype with 20+ screens for an ads platform with Invision Studio",
            "Built a design system with over 100+ independent mini-components",
            "Wrote developer-friendly documentation for the design specifications and guidelines"
        ],
        technologies: [
            "Figma",
            "Adobe Illustrator",
            "Adobe After Effects",
            "InVision Studio",
            "User Interface (UI)",
            "User Experience (UX)"
        ]
    },
    {
        title: "Front-end Developer",
        company: "Freelance",
        period: "2017 - 2019",
        description: [
            "Built an AngularJS website for Sleets, a web app with black and white reading modes for book and novel excerpts",
            "Developed a custom WYSIWYG editor for Sleets to write short stories and excerpts",
            "Developed and deployed a native Android app for Sleets with Social Auth, reading modes, and custom views",
            "Developed and deployed a native Android app for Tasteplore for rating movies on mobile devices",
            "Developed and deployed a native Android Game named Stitch, a unique dot-connecting puzzle game",
            "Developed a back-end REST API for a database of ships, ports, and mariners",
            "Developed and deployed a native Android app for Marinefy for mariners to chat, track voyages, and explore ship details"
        ],
        technologies: [
            "Android",
            "Java",
            "Kotlin",
            "AngularJS",
            "HTML",
            "CSS",
            "JavaScript",
            "Node.js",
            "NGINX",
            "Elasticsearch",
            "MongoDB",
            "Express.js",
            "APIs",
            "REST",
            "HTML5 Canvas",
            "XML",
            "Web Development",
            "React Native",
            "Responsive UI",
            "React",
            "Next.js",
            "HTML5",
            "User Interface (UI)",
            "User Experience (UX)",
            "Front-end Development",
            "REST APIs",
            "HTML DOM",
            "DigitalOcean",
            "JSON",
            "Responsive Web Apps",
            "CSV File Processing",
            "Google Play Store",
            "Front-end",
            "Websites",
            "Development",
            "RxJava",
            "MVC Design",
            "Amazon Web Services (AWS)"
        ]
    }
];

export const WorkExperienceAccordion = () => {
    return (
        <div className={`flex-1 max-w-3xl p-8 md:p-12 flex flex-col items-start ${inter.className}`}>
            <h2 className="text-2xl md:text-3xl font-medium mb-6 text-gray-100">Developer Experience</h2>
            <Accordion className="w-full space-y-2">
                {workExperiences.map((exp, index) => (
                    <AccordionItem
                        key={index}
                        value={`item-${index}`}
                        className="border border-gray-800 rounded-lg px-4"
                    >
                        <AccordionTrigger className="hover:no-underline">
                            <div className="flex flex-col items-start py-2">
                                <h3 className="text-lg font-medium text-gray-100">{exp.title}</h3>
                                <p className="text-sm text-gray-400">{exp.company} • {exp.period}</p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-4 py-2">
                                <ul className="space-y-2 text-gray-300 text-sm">
                                    {exp.description.map((item, idx) => (
                                        <li key={idx} className="leading-relaxed">• {item}</li>
                                    ))}
                                </ul>
                                <div className="flex flex-wrap gap-1.5 pt-2">
                                    {exp.technologies.map((tech, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2 py-0.5 bg-gray-800/50 rounded text-xs text-gray-400"
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}; 