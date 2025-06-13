import { Inter } from "next/font/google";

const inter = Inter({ subsets: ['latin'] });

export const FounderActivity = () => {
    const spotifyUrls = [
        'https://open.spotify.com/embed/episode/3g9QWj1POqX4Oc6VvGqTiT',
        'https://open.spotify.com/embed/episode/6ro7VHpx3R58V5LxkmXh6S'
    ];

    const linkedinActivity = [
        "https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7336469274661634051?collapsed=1"
    ];

    const featuredOn = [
        {
            platform: "Toptal",
            icon: "/icons/toptal.webp",
            title: "Top 3% Talent",
            description: "Recognized as one of the top 3% of developers worldwide",
            link: "https://www.toptal.com/resume/subhakar-tikkireddy"
        }
    ];

    const industries = [
        {
            industry: "Frontend",
            icon: "https://cdn.svgporn.com/logos/react.svg",
            technologies: ["React", "React Native", "Next.js", "TypeScript", "Tailwind CSS", "Web Performance"]
        },
        {
            industry: "Blockchain",
            icon: "https://cdn.svgporn.com/logos/ethereum.svg",
            technologies: ["EVM", "Smart Contracts", "Metamask", "Phantom", "Gasless", "DeFi", "NFTs", "Solidity"]
        },
        {
            industry: "AI/ML",
            icon: "https://cdn.svgporn.com/logos/tensorflow.svg",
            technologies: ["LLMs", "Multi Agentic Workflow", "AI Agents", "RAG", "Vector Databases", "AI-SDK", "Claude, Gemini, & OpenAi Models"]
        },
        {
            industry: "Cloud",
            icon: "https://cdn.svgporn.com/logos/aws.svg",
            technologies: ["AWS", "Lambda", "SES", "Github Actions", "Octokit", "Digital Ocean", "EC2 Instances", "S3 Buckets", "Serverless", "Microservices"]
        },
        {
            industry: "DevOps",
            icon: "https://cdn.svgporn.com/logos/docker-icon.svg",
            technologies: ["CI/CD", "Docker", "Github Workflows", "Octokit & Github Apps", "Infrastructure as Code", "Monitoring"]
        }
    ];

    return (
        <div className={`flex-1 max-w-3xl p-8 md:p-12 flex flex-col items-start justify-start ${inter.className}`}>
            <h2 className="text-2xl md:text-3xl font-medium mb-6 text-gray-100">Podcast Appearances</h2>
            <div className='flex flex-col gap-4 w-full space-y-4'>
                {spotifyUrls.map((url, index) => (
                    <iframe
                        key={index}
                        src={url}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-lg"
                    />
                ))}
            </div>
            <h2 className="text-2xl md:text-3xl font-medium my-6 text-gray-100">Featured</h2>
            <div className="w-full mb-8">
                {featuredOn.map((item, index) => (
                    <a
                        key={index}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:bg-gray-800/70 transition-colors"
                    >
                        <img
                            src={item.icon}
                            alt={`${item.platform} icon`}
                            className="w-8 h-8"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-medium text-gray-100">{item.platform}</h3>
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                                    {item.title}
                                </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                        </div>
                    </a>
                ))}
            </div>
            <h2 className="text-xl md:text-2xl font-medium my-8 text-gray-100">Industries & Expertise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {industries.map((item, index) => (
                    <div key={index} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                        <div className="flex items-center gap-3 mb-3">
                            <img
                                src={item.icon}
                                alt={`${item.industry} icon`}
                                className="w-6 h-6"
                            />
                            <h3 className="text-lg font-medium text-gray-100">{item.industry}</h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {item.technologies.map((tech, techIndex) => (
                                <span
                                    key={techIndex}
                                    className="px-2 py-0.5 bg-gray-700/50 text-gray-200 rounded-full text-xs"
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}