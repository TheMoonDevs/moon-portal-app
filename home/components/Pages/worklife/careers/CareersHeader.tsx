import { APP_ROUTES } from "@/utils/constants/AppInfo";
import Image from "next/image";
import { CareerHeaderStyled } from "./CareersHeader.styles";
import { Link } from "@/components/App/Global/react-transition-progress/CustomLink";

const CareersHeader = () => {
  return (
    <CareerHeaderStyled>
      <div className="header_logo">
        <Image
          className="logo_image"
          src="/logo/logo.png"
          alt="moon devs logo"
          width={50}
          height={50}
        />
        <span className="logo_text">THE MOON DEVS</span>
      </div>
      <div className="page_header">
        <span className="page_text">CAREERS</span>
      </div>
      <Link href={APP_ROUTES.workLife}>
        <div className="home_btn">
          <span className="material-symbols-outlined">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </span>
          <span >BACK TO WORKLIFE</span>
        </div>
      </Link>
    </CareerHeaderStyled>
  );
};

export default CareersHeader;
