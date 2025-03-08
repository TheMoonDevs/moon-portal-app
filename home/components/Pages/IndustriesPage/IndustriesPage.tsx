import IndustryHeroSection from './IndustryHeroSection';
import IndustryList from './IndustryList';

const IndustriesPage = () => {
  return (
    <main className="flex flex-col items-center justify-center bg-[#F5F2F0] text-black">
      <IndustryHeroSection />
      <IndustryList />
    </main>
  );
};

export default IndustriesPage;
