import { Raleway } from 'next/font/google';

const raleway = Raleway({ weight: '700', subsets: ['latin'] });

interface Experience {
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string[];
    technologies: string[];
}

const experiences: Experience[] = [
    {
        title: "React Front-end Developer",
        company: "Toptal",
        location: "Vijayawada, Andhra Pradesh, India",
        startDate: "September 2022",
        endDate: "Present",
        description: [
            "Specializing in user experience and performance optimization",
            "Working across crypto, media, internet, branding, marketing, and game studios",
            "Building MVPs for numerous startups",
            "Expertise in React, Next.js, TypeScript, and React Native",
            "Published author on Toptal Engineering Blog"
        ],
        technologies: [
            "React.js",
            "Next.js",
            "TypeScript",
            "React Native",
            "Node.js",
            "JavaScript",
            "HTML5",
            "CSS",
            "Tailwind CSS",
            "Web3.js",
            "REST API",
            "Vercel"
        ]
    }
];

export const ExperienceSection = () => {
    return (
        <div className="flex-1 flex-grow-1 max-w-4xl p-16 flex flex-col items-start justify-center">
            <h2 className={`text-3xl md:text-5xl font-thin mb-8 leading-tight ${raleway.className}`}>Experience</h2>
            <div className="space-y-12">
                {experiences.map((exp, index) => (
                    <div key={index} className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold">{exp.title}</h3>
                                <p className="text-gray-300">{exp.company} • {exp.location}</p>
                            </div>
                            <p className="text-gray-400 mt-2 md:mt-0">
                                {exp.startDate} - {exp.endDate}
                            </p>
                        </div>
                        <ul className="list-disc list-inside space-y-2 text-gray-300">
                            {exp.description.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                        <div className="flex flex-wrap gap-2">
                            {exp.technologies.map((tech, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-300"
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 