import { ReferHeroStyled } from "./ReferHero.styles";
import Image from "next/image";
import { ReferScrollState } from "../types";
import { APP_INFO, APP_ROUTES } from "@/utils/constants/AppInfo";
import { Button } from "@mui/material";
import { Link } from "@/components/App/Global/react-transition-progress/CustomLink";

export const ReferHeroSection = () => {
  return (
    <ReferHeroStyled className="section" id={ReferScrollState.HERO}>
      <div className="header_box">
        <Link href={APP_ROUTES.index}>
          <div className="logobar">
            <Image src="/logo/logo.png" alt="" width={36} height={36} />
            <span className="app_title">The Moon Devs</span>
          </div>
        </Link>
      </div>
      <div className="bold_box">
        <Image
          className="bold_stamp mobile_stamp"
          src="/images/referrals/ondemand.jpg"
          alt=""
          width={300}
          height={300}
        />
        <div className="bold_content">
          <h1 className="bold_bigtitle">Uplift</h1>
          <p className="bold_subtitle">
            your Networ
            <span className="relative">
              k
              <Image
                className="bold_stamp desktop_stamp"
                src="/images/referrals/ondemand.jpg"
                alt=""
                width={300}
                height={300}
              />
            </span>
          </p>
          <p className="bold_tagline">* Earn 2000$ for every referral </p>
        </div>
      </div>
      <div className="caption_box">
        <div className="caption">
          <p>
            Refer <em>TheMoonDevs</em> to your friends who&apos;re building tech
            products. They need an excellent variable as much as we need a
            committed client. Tune up your connections and cash in your rewards.
          </p>
          <Link href={APP_INFO.mail_refer}>
            <Button
              endIcon={
                <span
                  style={{ display: "block" }}
                  className="material-symbols-outlined"
                >
                  arrow_forward
                </span>
              }
              variant="contained"
              className="refer_button"
            >
              Refer Your Friend!
            </Button>
          </Link>
          <p className="caption_small">
            * Please give us comprehensive details for a succesful referral.
          </p>
        </div>
      </div>
    </ReferHeroStyled>
  );
};
