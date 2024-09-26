import Image from "next/image";
import { ReferFooterStyles } from "./ReferFooter.styles";
import { Button, useMediaQuery } from "@mui/material";
import { reverseMedia } from "@/styles/media";
import { ReferScrollState } from "../types";
import Link from "next/link";
import { APP_INFO } from "@/utils/constants/AppInfo";

export const ReferFooter = () => {
  const isTablet = useMediaQuery(reverseMedia.tablet);
  return (
    <ReferFooterStyles id={ReferScrollState.FOOTER}>
      <div className="footer_content">
        <Image
          src="/logo/logo_white.png"
          alt="logo"
          width={100}
          height={100}
          className="footer_logo"
        />

        <div className="footer_text">
          <div className="footer_heading_container">
            <p className="footer_heading">Ignite your presence!</p>
            <p className="footer_description">
              Join our community of referrers and unlock exclusive benefits.
            </p>
            {/* TODO: ADD BUTTONS HERE */}
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
          </div>

          <Link href={""} className="footer_cta_container">
            <div className="footer_cta_wrapper">
              <Image
                className=""
                src="/icons/refer-your-friends.svg"
                alt="refer icon"
                width={200}
                height={200}
              />
              <span className="material-symbols-outlined">north_east</span>
            </div>
          </Link>
        </div>
      </div>
    </ReferFooterStyles>
  );
};
