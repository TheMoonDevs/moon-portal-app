import { CareersHomeStyled } from './CareersHomePage.styles';
import { WorklifeFooter } from '../WorkLifeHomePage/WorklifeFooter';
import CareersHeader from './CareersHeader';
import FilterCard from './FilterCard';
import { JobapplicationDocument } from '@/prismicio-types';
import { useEffect, useState } from 'react';
import JobCard from './JobCard';

const CareersHomePage = ({
  jobPosts,
}: {
  jobPosts: JobapplicationDocument[];
}) => {
  const [isTextVisible, setIsTextVisible] = useState<boolean>(false);
  const [departmentJobsCounts, setDepartmentJobsCounts] = useState<{
    [key: string]: number;
  }>({});
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  const [isDateSwitchSelected, setIsDateSwitchSelected] =
    useState<boolean>(true);

  const toggleTextVisibility = () => {
    setIsTextVisible(!isTextVisible);
  };

  const _mappedPosts = jobPosts.map((jp) => {
    return {
      url: jp.url,
      type: jp.type,
      id: jp.id,
      last_publication_date: jp.last_publication_date, // FORMAT => 2024-03-26T17:42:20+0000
      info: jp.data.slices.find((slice) => slice.slice_type === 'job')?.primary,
      department: jp.data.slices.find((slice) => slice.slice_type === 'job')
        ?.primary?.department,
    };
  });

  const jobsCount = () => {
    const newCounts: { [key: string]: number } = {};
    _mappedPosts.forEach((job) => {
      const department = job.department;
      if (department) {
        newCounts[department] = (newCounts[department] || 0) + 1;
      }
    });
    setDepartmentJobsCounts(newCounts);
  };

  useEffect(() => {
    jobsCount();
  }, [jobPosts]);

  let sortedPosts = [..._mappedPosts];
  if (isDateSwitchSelected) {
    sortedPosts.sort((a, b) =>
      b.last_publication_date.localeCompare(a.last_publication_date)
    );
  }

  return (
    <CareersHomeStyled>
      <CareersHeader />
      <div className="careers_container">
        <div className="careers_grid">
          <FilterCard
            toggleTextVisibility={toggleTextVisibility}
            isTextVisible={isTextVisible}
            departmentJobsCounts={departmentJobsCounts}
            activeDepartment={activeDepartment}
            setActiveDepartment={setActiveDepartment}
            isDateSwitchSelected={isDateSwitchSelected}
            setIsDateSwitchSelected={setIsDateSwitchSelected}
          />
          {sortedPosts
            ?.filter(
              (job) =>
                activeDepartment === null || job.department === activeDepartment
            )
            .map((job: (typeof _mappedPosts)[0], index: number) => (
              <JobCard key={index} job={job} isTextVisible={isTextVisible} />
            ))}
        </div>
      </div>
      <div className="footer_wrapper">
        <WorklifeFooter />
      </div>
    </CareersHomeStyled>
  );
};

export default CareersHomePage;
