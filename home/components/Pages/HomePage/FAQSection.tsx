import { FAQSectionStyled } from "./FAQSection.styles";
import { SectionWithGrids } from "./SectionWithGrids";
import Image from "next/image";
import crypto from "@/public/icons/exp/crypto.svg";
import media from "@/public/icons/exp/media.svg";
import social from "@/public/icons/exp/social.svg";
import ecommerce from "@/public/icons/exp/ecommerce.svg";
import deep from "@/public/icons/exp/deep.svg";
import integration from "@/public/icons/exp/integration.svg";
import { useEffect, useRef, useState } from "react";
import theme from "@/styles/theme";
import useOnScreen from "@/utils/hooks/useOnScreen";
import { FirebaseEvents, FirebaseSDK } from "@/utils/service/firebase";

const FAQs = [
  {
    id: "free_trial",
    title: "How does TheMoonDevs' 7-day free trial work?",
    answer:
      "Signing up for our trial is simple! After registration, you'll gain access to a pro developer / team for 7 days at no risk. Experience their expertise firsthand to ensure it aligns with your project needs and only then make your choice.",
    helper: "Fun Fact: We’ve received zero refund requests in last 6 years",
  },
  {
    id: "commitment",
    title: "Can I not commit after the 7-day trial, and is it obligatory?",
    answer:
      "Commitment is entirely optional. After the trial, you decide whether to continue working with TheMoonDevs based on your satisfaction and the value experienced during the trial period. (97% of our clients do.)",
  },
  {
    id: "pay-7",
    title: "Will I have to pay for the 7-day trial?",
    answer:
      "Yes, the trail is only risk-free, that is if you chose to not continue post trail, we will bear the burden for the trail weeks expenses, but if you chose to move forward, the trail week will be included in your overall project cost.",
  },
  {
    id: "confidentiality",
    title: "How is my project's confidentiality ensured?",
    answer:
      "We take privacy seriously. TheMoonDevs guarantees 100% confidentiality—we do not share any project information with third parties, ensuring your ideas and data remain secure. We have preset NDA agreements in place for all our pro developers.",
  },
  {
    id: "flexibility",
    title: "How flexible is TheMoonDevs with project requirements and changes?",
    answer:
      "We understand that projects evolve. We'll work closely with you to accommodate any adjustments needed and reset the sprint timelines and project costs accordingly.",
  },
  {
    id: "reliability",
    title: "How reliable are TheMoonDevs' developers?",
    answer:
      "Our developers are handpicked experts with a minimum of 5 years of experience. They know the contract terms insides-out on how to work with you, or to be there when it matters you the most.",
  },
  {
    id: "dissatisfaction",
    title: "What if I'm dissatisfied after committing to collaborate?",
    answer:
      "If, for any reason, you find the collaboration unsatisfactory post the first month, we offer a full refund (of that weeek/sprint/project) and an extra $1000 as compensation for your time and trust. We are confident that you will love our developers and we ensure constinuous quality outputs.",
  },
];

const additionalFAQs = [
  {
    id: "billing",
    title: "How does billing work?",
    answer:
      "We have transparent billing systems - we bill you bi-weekly for the work done by your assigned team/developer. You can view the detailed breakdown of the work done and the hours spent on your project dashboard.",
  },
  {
    id: "fixed-cost",
    title: "Can I get a fixed cost for my project?",
    answer:
      "As the developers works often involve uncertain deadlines, providing for fixed cost engagements is tough, though we can give you an estimate, it is subjective to change on the basis of feature requests.",
  },
  {
    id: "pause_stop_services",
    title: "Can I pause or stop services at any point during the project?",
    answer:
      "Yes, you have the flexibility to pause or stop services. TheMoonDevs understands that circumstances may change, and we aim to provide a seamless experience aligned with your project's needs.",
  },
  {
    id: "moondevs_different",
    title: "What sets TheMoonDevs apart from other development services?",
    answer:
      "TheMoonDevs stands out for its commitment to risk-free trials, personalized service, and transparent collaboration. Our focus on client satisfaction and confidentiality distinguishes us in the industry.",
  },
  {
    id: "feedback",
    title:
      "Can I provide feedback on the trial experience and suggest improvements?",
    answer:
      "Absolutely! Your feedback is valuable. We encourage open communication and welcome any suggestions for improvement to enhance your experience with TheMoonDevs.",
  },
  {
    id: "suitable_projects",
    title: "What types of projects are suitable for TheMoonDevs' services?",
    answer:
      "TheMoonDevs is versatile and can handle various projects, from small startups to large enterprises. Our developers and in-house product team are adept at adapting to diverse project scopes and requirements.",
  },
];

export const FAQSection = () => {
  const [activeFAQS, setActiveFAQS] = useState<string>("");
  const [expandMore, setExpandMore] = useState<boolean>(false);
  const [logged, setLogged] = useState<boolean>(false);

  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref);

  // console.log({ isVisible });

  useEffect(() => {
    if (isVisible && !logged) {
      FirebaseSDK.logScreenView(
        FirebaseEvents.SCREEN_NAME_FAQSECTION,
        FirebaseEvents.SCREEN_CLASS_FAQSECTION
      );
      setLogged(true);
    }
  }, [isVisible, logged]);

  // console.log(activeFAQS);

  return (
    <FAQSectionStyled ref={ref}>
      <div className="faq_sidebar">
        <h1 className="faq_title">FAQs</h1>
      </div>
      <div className="faq_box">
        {/* <h1 className="subtitle">Our Recent Projects</h1> */}
        <div className="faq_flexbox">
          {FAQs.map((faq) => (
            <div
              onClick={() => {
                setActiveFAQS((prev) => {
                  if (prev === faq.id) {
                    return "";
                  }
                  return faq.id;
                  //   if (prev.includes(faq.id)) {
                  //     return prev.filter((id) => id !== faq.id);
                  //   }
                  //   return [...prev, faq.id];
                });
              }}
              key={faq.title}
              className={`faq_point ${faq.id === activeFAQS ? "active" : ""}`}
            >
              <div className="faq_question">
                {faq.title}
                <div className="faq_icon">
                  <span
                    className={`material-symbols-outlined rotatable-icon ${
                      faq.id === activeFAQS ? "rotate" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </div>
              </div>
              <div className="faq_answer">
                <p>
                  {faq.answer ||
                    `Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Voluptatibus, doloribus. Lorem ipsum dolor sit amet
                  consectetur adipisicing elit. Voluptatibus, doloribus.`}
                  <br />
                  <span className="helper">{faq.helper}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
        {/* expand more FAQ section */}

        <div
          className={`faq_flexbox expand-div ${expandMore ? "visible" : ""} `}
        >
          {additionalFAQs.map((faq) => (
            <div
              onClick={() => {
                setActiveFAQS((prev) => {
                  if (prev === faq.id) {
                    return "";
                  }
                  return faq.id;
                });
              }}
              key={faq.title}
              className={`faq_point ${faq.id === activeFAQS ? "active" : ""}`}
            >
              <div className="faq_question">
                {faq.title}
                <div className="faq_icon">
                  <span
                    className={`material-symbols-outlined rotatable-icon ${
                      faq.id === activeFAQS ? "rotate" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </div>
              </div>
              <div className="faq_answer">
                <p>
                  {faq.answer ||
                    `Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Voluptatibus, doloribus. Lorem ipsum dolor sit amet
                  consectetur adipisicing elit. Voluptatibus, doloribus.`}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* expand more icon */}
        <div className="expand-icon" onClick={() => setExpandMore(!expandMore)}>
          <p>{expandMore ? "Hide" : "Read more"}</p>
          <span
            className={`rotatable-icon material-symbols-outlined ${
              expandMore ? "rotate padded" : ""
            }`}
          >
            expand_more
          </span>
        </div>
      </div>
    </FAQSectionStyled>
  );
};

export const FAQSectionWithGrids = SectionWithGrids(FAQSection, {
  backgroundColor: theme.fixedColors.whiteSmoke,
  color: theme.fixedColors.lightSilver,
});
