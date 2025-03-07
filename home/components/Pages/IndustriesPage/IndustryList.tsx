import {
  IIndustryAndProjects,
  IProjects,
  projectsData,
} from '../HomePage/IndustrySection/IndustryData';
import IndustryCarousel from './IndustryCarousel';

const IndustryList = () => {
  return projectsData.map((industry: IIndustryAndProjects, index) => (
    <div className={`w-full ${index % 2 === 0 ? 'bg-black' : 'bg-white'}`}>
      <IndustryCarousel
        theme={index % 2 === 0 ? 'dark' : 'light'}
        key={industry.industry}
        industryArticles={industry.projects}
        industryName={industry.industry}
      />
    </div>
  ));
};
export default IndustryList;
