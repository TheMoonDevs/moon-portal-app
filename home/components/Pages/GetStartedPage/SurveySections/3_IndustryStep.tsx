import { StepParams, SurveySteps } from "./_SurveySection";
import { StepStyled } from "./_stepStyles";

const Industries = [
  {
    icon: "smart_toy",
    value: "ai-integrations",
    title: "AI integrations",
    subtitle:
      "Gen AI Text/Image, Chatbots, Sentiment Analysis, Text <-> Speech",
  },
  {
    icon: "database",
    value: "crypto",
    title: "Crypto",
    subtitle:
      "Wallet Dashboards, DEX & ICO platforms, Defi & NFT, Crypto exchanges",
  },
  {
    icon: "play_circle",
    value: "video-streaming",
    title: "Video Streaming",
    subtitle: "Live streaming, OTT Platforms, Video CMS, Transcoding services",
  },
  {
    icon: "shopping_cart",
    value: "e-commerce",
    title: "E-Commerce",
    subtitle: "Shopify, SEO, CRM tools, Payments (Stripe, PayPal, Crypto)",
  },
  {
    icon: "equalizer",
    value: "analytics-tools",
    title: "Analytics & Tools",
    subtitle:
      "Predictive Analytics, Marketing Automation, Business dashboards, SEO, Geo-Tagging",
  },
  {
    icon: "sports_esports",
    value: "gaming",
    title: "Gaming",
    subtitle:
      "Cross-platform multiplayer, MMORPG, Cloud Gaming, Social features, In-app purchases",
  },
  {
    icon: "credit_card",
    value: "fin-tech",
    title: "Fin Tech",
    subtitle:
      "Trading Platforms, Mobile Banking, Digital wallets, Peer-to-peer Payments, Portfolio Management",
  },
  {
    icon: "view_in_ar",
    value: "ar-vr",
    title: "Augmented Reality",
    subtitle:
      "Markerless AR, Product Visulaisation, AR apps in Education, Training, Tourism or Navigation",
  },
  {
    icon: "school",
    value: "ed-tech",
    title: "Ed Tech",
    subtitle:
      "Mock Tests Platforms, Gamified assessments, Virtual classrooms, LMS plugins, Group Chat, Video conferencing",
  },
  {
    icon: "more_horiz",
    value: "other",
    title: "Other",
    subtitle:
      "News feeds, messaging apps, metaverse, live streaming, audio rooms, etc...",
  },
];

export const IndustryStep = ({ setStep, setForm, form }: StepParams) => {
  return (
    <StepStyled>
      {/* <h1 className="title">How big is your team?</h1> */}
      <p className="subtitle">{`Which space does your project belong to?`}</p>
      <div className="card_list_industry minified">
        {Industries.map((industry, index) => (
          <div
            key={industry.value}
            className="selectable_card card items_start card-slideup"
            style={
              { "--slideup-delay": `${index * 0.12}s` } as React.CSSProperties
            }
            onClick={() => {
              setForm((prev) => ({ ...prev, industry: industry.value }));
              setStep(SurveySteps.REQUIREMENT_TYPE);
            }}
          >
            <span
              className={`material-symbols-outlined icon xsmall check_icon ${
                form?.industry === industry.value ? "active" : ""
              }`}
            >
              task_alt
            </span>
            <div className="header">
              <span className="material-symbols-outlined icon small">
                {industry.icon}
              </span>
              <p className="card_title mini">{industry.title}</p>
            </div>
            <p className="card_text_small">{industry.subtitle}</p>
          </div>
        ))}
      </div>
    </StepStyled>
  );
};
