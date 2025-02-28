import { BaseCard } from '@/components/elements/Card';
import Image from 'next/image';

const IndustrySection = () => {
  return (
    <section>
      <div className="bg-linear-to-bottom-black-blue xs:p-10 grid grid-cols-1 p-8 pt-20 md:p-16 md:pt-20 xl:grid-cols-2 xl:bg-linear-to-right-black-blue xl:p-28">
        <div>
          <IndustrySectionHeading />
          <ProjectList />
        </div>
        <DownloadGuide />
      </div>
    </section>
  );
};

const DownloadGuide = () => {
  return (
    <div className="mt-14 flex items-start justify-center xl:mt-0 xl:justify-end">
      <div className="flex w-full flex-col items-start justify-stretch rounded-2xl rounded-tl-[8rem] bg-gray-300/50 p-4 pt-10 xl:w-fit xl:max-w-lg xl:flex-col xl:items-start">
        <div className="relative w-full">
          <Image
            src="/images/project-images.png"
            className="w-full"
            alt="Project Images"
            width={500}
            height={500}
          />
          <div className="absolute -bottom-8 right-[5%] z-10 flex flex-col text-6xl font-bold leading-[8rem] sm:text-[8rem] sm:leading-normal">
            <span>20</span>
            <span className="-mt-[4.5rem]">25</span>
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-black p-6 pt-12">
          <div className="flex w-fit flex-col gap-4">
            <h1 className="text-3xl font-bold md:text-4xl">MoonDev-Folio</h1>
            <p>
              Our teams have helped more than 56 startups, 132 Feature requests
              for many innovations across the globe. Get an informative guide
            </p>
            <div className="mt-2 flex w-full flex-col items-center rounded-full border-transparent bg-black md:mt-8 md:flex-row md:border-[1px] md:border-gray-500 md:p-1.5">
              <input
                type="email"
                onChange={(e) => {}}
                placeholder="Enter your Mail"
                className="w-full flex-1 rounded-full border border-gray-500 bg-transparent px-4 py-2 text-white placeholder-gray-400 outline-none md:w-auto md:rounded-none md:border-none"
              />
              <button className="mt-4 w-full rounded-full border border-white bg-white px-4 py-2 font-medium text-black transition hover:bg-gray-200 md:mt-0 md:w-auto">
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface IIndustryAndProjects {
  industry: string;
  projects: { title: string; isHot: boolean }[];
}

const projectsData: IIndustryAndProjects[] = [
  {
    industry: 'Crypto',
    projects: [
      { title: 'BoB based gaming web3 competitions', isHot: false },
      { title: 'VRF based randomness', isHot: false },
      { title: 'Pre IPO based ERC-20 Tokens (CryptoCoin)', isHot: false },
      { title: 'bitcoin fork chain (EVM based)', isHot: false },
      { title: 'NFT & ERC-20 Platforms', isHot: false },
      { title: 'Wallet Plugins for Browsers', isHot: false },
      { title: 'Base Chain Platforms', isHot: false },
      { title: 'Smart Wallet Integration (Zero Gas Fees)', isHot: true },
      { title: 'Embedded Wallet Setup', isHot: false },
      { title: 'Ramp Integrations for Onboarding Users', isHot: false },
    ],
  },
  {
    industry: 'Ai',
    projects: [
      { title: 'Gen AI integrations (image, video, audio)', isHot: false },
      { title: 'Dynamic SEO & link previews based on AI', isHot: false },
    ],
  },
  {
    industry: 'SaaS',
    projects: [
      { title: 'AR 3d model placements in React Native App', isHot: false },
      { title: 'Integrating live collaboration (like figma)', isHot: true },
      {
        title: 'Slack, Discord, Twitter Bots for Internal updates',
        isHot: false,
      },
      { title: 'Predictive analytics & AI-powered dashboards', isHot: false },
      { title: 'Ecommerce RAG based Framework', isHot: false },
      { title: 'Workplace tools for enterprises', isHot: false },
      { title: 'webRTC based live streaming meets', isHot: false },
    ],
  },
  {
    industry: 'App',
    projects: [
      { title: 'AR 3d model placements in React Native App', isHot: false },
      { title: 'NFC card Authorization / Registrations', isHot: false },
      { title: 'Social Tracking App for mariners', isHot: false },
      { title: 'React Web Apps deployed hybrid', isHot: true },
      { title: 'Interactive Gesture Experiences for App', isHot: false },
      { title: 'Contact based syncing for a Social App', isHot: false },
      { title: 'Biometric & Passkey Authentications', isHot: true },
    ],
  },
  {
    industry: 'Misc',
    projects: [
      { title: 'Threejs based virtual product view', isHot: false },
      { title: 'DevOps setup for private repos deployed on VPS', isHot: false },
      { title: 'Telegram Mini Apps', isHot: false },
      { title: 'Unity + Photon Multiplayer Games', isHot: false },
      { title: 'Unity + Photon Multiplayer Games', isHot: false },
    ],
  },
];

const ProjectList = () => {
  // Sort industries by project count (descending)
  const sortedIndustries = projectsData.sort(
    (a, b) => b.projects.length - a.projects.length,
  );

  // Select two biggest industries for the left column
  const leftColumnIndustries = sortedIndustries.slice(0, 2);

  // Place the rest in the right column
  const rightColumnIndustries = sortedIndustries
    .slice(2)
    .sort((a, b) => a.projects.length - b.projects.length);
  return (
    <div className="mt-14 grid w-full grid-cols-1 justify-items-start gap-6 sm:grid-cols-2 sm:justify-items-center xl:w-fit xl:justify-items-start">
      {/* Column 1 - Two big projects */}
      <div className="flex flex-col gap-6">
        {leftColumnIndustries.map((industry) => (
          <div key={industry.industry}>
            <h2 className="mb-4 text-3xl font-semibold">{industry.industry}</h2>
            {industry.projects.map((project) => (
              <div
                key={project.title}
                className={`flex items-start gap-2 rounded-xl py-2 text-gray-300`}
              >
                <span className="w-fit">{project.title}</span>
                {project.isHot && (
                  <div className="flex items-end">
                    <span className="material-symbols-outlined text-orange-500">
                      local_fire_department
                    </span>
                    <span className="text-sm font-bold text-neutral-500">
                      Hot
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Column 2 - Three varied-height projects */}
      <div className="flex flex-col gap-6">
        {rightColumnIndustries.map((industry) => (
          <div key={industry.industry}>
            <h2 className="mb-4 text-3xl font-semibold">{industry.industry}</h2>
            {industry.projects.map((project) => (
              <div
                key={project.title}
                className={`flex items-start gap-2 rounded-xl py-2 text-gray-300`}
              >
                <span className="w-fit">{project.title}</span>
                {project.isHot && (
                  <div className="flex items-end">
                    <span className="material-symbols-outlined text-orange-500">
                      local_fire_department
                    </span>
                    <span className="text-sm font-bold text-neutral-500">
                      Hot
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const IndustrySectionHeading = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold md:text-[2.5rem]">
        Recent Industries & projects
      </h1>
      <p className="mt-2 font-light text-gray-200">
        Helping seed-stage startups turn ideas into market-ready MVPs.
      </p>
    </div>
  );
};

export default IndustrySection;
