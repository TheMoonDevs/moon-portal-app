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
import { ReferFaqSectionStyled } from "./ReferFaq.styles";
import { ReferScrollState } from "../types";

const FAQs = [
  {
    id: "referral_join",
    title: "Who can join the referral program?",
    answer:
      "Anyone who cares about their network can join our referral program! Whether you're a clientnpm , partner, or just a fan of our work, you’re welcome. Join us and be part of something meaningful.",
  },
  {
    id: "referral_account",
    title:
      "Do I need a TheMoonDevs account to participate in the referral program?",
    answer:
      "Yes. You need to create an account to join our referral program and track your payouts. It’s quick and easy to sign up :)",
  },
  {
    id: "referral_credit",
    title: "How much credit can I earn?",
    answer:
      "Unlimited! Refer someone successfully, and you’ll earn 20% of their total bill, up to $2000 for each referral.",
  },
  {
    id: "referral_projects",
    title: "What type of projects can I refer for?",
    answer:
      "We specialize in projects involving AI integration, crypto, video streaming, ecommerce, analytics and tools, gaming, fintech, and augmented reality. If you have referrals in these areas, we’re ready to deliver exceptional results. And we’re open to exploring other areas which align with our expertise.",
  },
  {
    id: "referral_rewards",
    title: "When and How do I receive my referral rewards?",
    answer:
      "Please reach out to our support team at contact@themoondevs.com to learn more about how and when you can receive your referral rewards.",
  },
  {
    id: "referral_multiple",
    title: "Can I refer multiple friends?",
    answer:
      "Of course! You can refer multiple friends without any limits. Share the opportunity and reap the rewards together!",
  },
];

const additionalFAQs = [
  {
    id: "referral_successful",
    title: "What qualifies as a successful referral?",
    answer:
      "A successful referral is when the person you referred gets successfully onboarded and actively involved. It’s that simple!",
  },
  {
    id: "referral_more_info",
    title: "If I want to know more about the referral program?",
    answer:
      "Please reach out to our support team at contact@themoondevs.com. We’ll be happy to assist you!",
  },
  {
    id: "referral_self_company",
    title: "Can I refer myself or my company for rewards?",
    answer: "New client + new engagement + new source revenue = referral",
  },
  {
    id: "referral_restrictions",
    title: "Are there any restrictions on who I can refer?",
    answer:
      "As long as your referrals match our expertise with our offerings, you’re good to go! If you’re unsure whether a referral fits, feel free to reach out contact@themoondevs.com.",
  },
  {
    id: "referral_time_limit",
    title: "Is there a time limit for referrals to be eligible for rewards?",
    answer: "Minumum, 2 weeks of engagement & a target of 4 weeks engagement.",
    helper: "4 weeks target",
  },
  {
    id: "referral_track",
    title: "Can I track my referrals?",
    answer:
      "Yes, absolutely! You can track it through the dashboard. Once you’ve made a referral, you’ll be able to track its process, from initial contact to a successful engagement.",
  },
];

export const ReferFaq = () => {
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
    <ReferFaqSectionStyled ref={ref} id={ReferScrollState.FAQ}>
      <div className="faq_container">
        <div className="faq_sidebar">
          <h1 className="faq_title">FAQs</h1>
        </div>
        <div className="faq_box">
          <div className="faq_flexbox">
            {FAQs.map((faq) => (
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
                    <br />
                    {/* <span className="helper">{faq.helper}</span> */}
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
          <div
            className="expand-icon"
            onClick={() => setExpandMore(!expandMore)}
          >
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
      </div>
    </ReferFaqSectionStyled>
  );
};
