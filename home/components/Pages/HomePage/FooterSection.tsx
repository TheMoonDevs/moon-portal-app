/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { FooterSectionStyled } from "./FooterSection.styles";
import { SectionWithGrids } from "./SectionWithGrids";
import theme from "@/styles/theme";
import { APP_ROUTES, SOCIAL_ROUTES } from "@/utils/constants/AppInfo";
import { Tooltip } from "@mui/material";
import { Link } from "@/components/App/Global/react-transition-progress/CustomLink";

const Company = [
  {
    name: "Our Story",
    link: APP_ROUTES.index,
  },
  {
    name: "Worklife",
    link: APP_ROUTES.workLife,
  },
  {
    name: "Testimonials",
    link: "/",
  },
];

const Legal = [
  {
    name: "Privacy Policy",
    link: APP_ROUTES.docs_privacy,
  },
  {
    name: "Terms & Conditions",
    link: APP_ROUTES.docs_terms,
  },
];

const JoinUs = [
  {
    name: "Become a Moon Dev",
    link: APP_ROUTES.careers,
  },
  {
    name: "Refer and Earn",
    link: APP_ROUTES.refer_earn,
  },
];

const SocialLinks = [
  {
    name: "Twitter",
    link: SOCIAL_ROUTES.twitter,
    icon: "/icons/twitter.svg",
    helperText: "Connect with us on Twitter",
  },
  {
    name: "LinkedIn",
    link: SOCIAL_ROUTES.linkedin,
    icon: "/icons/linkedin.svg",
    helperText: "Connect with us on LinkedIn",
  },
  {
    name: "Discord",
    link: SOCIAL_ROUTES.discord,
    icon: "/icons/discord.svg",
    helperText: "Join Discord",
  },
  {
    name: "Telegram",
    link: SOCIAL_ROUTES.telegram,
    icon: "/icons/telegram.svg",
    helperText: "Join Telegram",
  },
  {
    name: "Instagram",
    link: SOCIAL_ROUTES.instagram,
    icon: "/icons/instagram.svg",
    helperText: "Follow us on Instagram",
  },
];

export const FooterSection = () => {
  return (
    <FooterSectionStyled>
      <div className="logobar">
        <div className="brand_logo">
          <Image src="/logo/logo_white.png" alt="" width={40} height={40} />
          <span className="app_title">The Moon Devs</span>
        </div>
        <p className="subtitle">Live your dream.</p>
      </div>
      <div className="footer_links">
        <div className="product_links">
          <div className="product_link">
            <span className="title">Company</span>
            <ul>
              {Company.map((item, index) => (
                <li key={index} className="link">
                  <Link href={item.link}>{item.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="product_link">
            <span className="title">Legal</span>
            <ul>
              {Legal.map((item, index) => (
                <li key={index} className="link">
                  <Link href={item.link}>{item.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="product_link">
            <span className="title">Join Us!</span>
            <ul>
              {JoinUs.map((item, index) => (
                <li key={index} className="link">
                  <Link href={item.link}>{item.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="social_links">
          <Link className="sign_up" href={APP_ROUTES.getStarted}>
            Sign up for free trial
          </Link>
          <div className="social_icons">
            {SocialLinks.map((item, index) => (
              <Link href={item.link} key={index}>
                <Tooltip
                  title={item.helperText}
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: theme.fixedColors.white,
                        color: theme.fixedColors.black,
                      },
                    },
                  }}
                  placement="bottom"
                >
                  <Image
                    src={item.icon}
                    alt={item.name}
                    className="icon"
                    width={22}
                    height={22}
                  />
                </Tooltip>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </FooterSectionStyled>
  );
};

export const FooterSectionWithGrids = SectionWithGrids(FooterSection, {
  backgroundColor: theme.fixedColors.black,
  color: theme.fixedColors.darkGrey,
});
