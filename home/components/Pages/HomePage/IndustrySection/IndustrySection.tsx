import { PublicationDialog } from '@/components/App/PublicationDialog';
import Image from 'next/image';
import { useState } from 'react';
import { IProjects, projectsData } from './IndustryData';
import DevFolioCard from '@/components/App/Global/FolioCard';

const IndustrySection = () => {
  return (
    <section>
      <div className="xs:p-10 grid grid-cols-1 bg-linear-to-bottom-black-blue p-8 pt-20 md:grid-cols-3 md:p-8 md:pt-20 xl:bg-linear-to-right-black-blue xl:p-28">
        <div className="md:col-span-2">
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
    <div className="mt-14 flex items-start justify-center md:mt-0 md:justify-end">
      <div className="flex w-full flex-col items-start justify-stretch rounded-2xl rounded-tl-[4rem] bg-gray-300/50 p-4 pt-10 md:w-fit md:max-w-lg md:flex-col md:items-start xl:rounded-tl-[6rem]">
        <div className="relative w-full">
          <Image
            src="/images/project-images.png"
            className="w-full"
            alt="Project Images"
            width={500}
            height={400}
          />
          <div className="absolute -bottom-8 right-[5%] z-10 flex flex-col text-6xl font-bold leading-[8rem] sm:leading-normal md:text-[5rem] xl:text-[6rem]">
            <span>20</span>
            <span className="-mt-[3.5rem]">25</span>
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-black p-6 pt-8">
          <DevFolioCard />
        </div>
      </div>
    </div>
  );
};

const ProjectList = () => {
  const [selectedPublication, setSelectedPublication] = useState<IProjects>();
  const [openDialog, setOpenDialog] = useState(false);
  // Separate "Misc" from other industries
  const miscIndustry = projectsData.find((i) => i.industry === 'Misc');
  const filteredIndustries = projectsData.filter((i) => i.industry !== 'Misc');

  // Sort industries by project count (descending)
  const sortedIndustries = [...filteredIndustries].sort(
    (a, b) => b.projects.length - a.projects.length,
  );

  // Select the two biggest industries for the left column
  const leftColumnIndustries = sortedIndustries.slice(0, 2);

  // Select industries for the right column (excluding "Misc")
  const rightColumnIndustries = sortedIndustries.slice(2, projectsData.length);

  // Ensure "Misc" is always the last entry in the right column
  if (miscIndustry) {
    rightColumnIndustries.push(miscIndustry);
  }

  return (
    <>
      <div className="mt-14 grid w-full grid-cols-1 justify-items-start gap-6 sm:grid-cols-2 sm:justify-items-center md:w-fit md:justify-items-start xl:gap-8">
        {/* Column 1 - Two big projects */}
        <div className="flex flex-col gap-6">
          {leftColumnIndustries.map((industry) => (
            <div key={industry.industry}>
              <h2 className="mb-4 text-2xl font-semibold">
                {industry.industry}
              </h2>
              {industry.projects.map((project) => (
                <div
                  onClick={() => {
                    setSelectedPublication({
                      ...project,
                      name: '',
                      avatar: '',
                    });
                    setOpenDialog(true);
                  }}
                  key={project.title}
                  className={`group flex cursor-pointer items-start gap-2 rounded-xl py-1 text-gray-400`}
                >
                  <span className="relative w-fit text-sm after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 after:content-[''] group-hover:text-white after:group-hover:w-full">
                    {project.title}
                  </span>
                  {project.isHot && (
                    <div className="flex items-end text-xs">
                      <span className="material-symbols-outlined text-orange-500">
                        local_fire_department
                      </span>
                      <span className="text-xs font-bold text-neutral-500">
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
              <h2 className="mb-4 text-3xl font-semibold">
                {industry.industry}
              </h2>
              {industry.projects.map((project) => (
                <div
                  onClick={() => {
                    setSelectedPublication({
                      ...project,
                      name: '',
                      avatar: '',
                    });
                    setOpenDialog(true);
                  }}
                  key={project.title}
                  className={`group flex cursor-pointer items-start gap-2 rounded-xl py-1 text-gray-400`}
                >
                  <span className="relative w-fit text-sm after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-white after:transition-all after:duration-200 after:content-[''] group-hover:text-white after:group-hover:w-full">
                    {project.title}
                  </span>
                  {project.isHot && (
                    <div className="flex items-end">
                      <span className="material-symbols-outlined text-orange-500">
                        local_fire_department
                      </span>
                      <span className="text-xs font-bold text-neutral-500">
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
      <PublicationDialog
        data={selectedPublication}
        open={openDialog}
        setOpenDialog={setOpenDialog}
        setPublication={setSelectedPublication}
      />
    </>
  );
};

const IndustrySectionHeading = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold md:text-[2.5rem]">
        Recent Industries & projects
      </h1>
      <p className="mt-2 font-light text-gray-300">
        Helping seed-stage startups turn ideas into market-ready MVPs.
      </p>
    </div>
  );
};

export default IndustrySection;
