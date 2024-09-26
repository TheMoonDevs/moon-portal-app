import React, { FormEvent, MouseEvent } from "react";
import {
  Button,
  CircularProgress,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { FormInfo, ListIds, StepParams, SurveySteps } from "./_SurveySection";
import { StepStyled } from "./_stepStyles";
import { useAuthSession } from "@/utils/hooks/useAuthSession";
import ClickupApi from "@/utils/service/ClickupApi";
import { MyServerApi } from "@/utils/service/MyServerApi";
import useAsyncState from "@/utils/hooks/useAsyncState";
import { MoonToast } from "@/components/App/Global/Toast";
import { useAppDispatch } from "@/redux/store";
import { setGlobalToast } from "@/redux/ui/ui.slice";
import useCampaignAnalytics from "@/utils/hooks/useCampaignAnalytics";
import Image from "next/image";
import { useCountryInfo } from "@/utils/hooks/useCountryInfo";
import { APP_INFO } from "@/utils/constants/AppInfo";
import { SlackBotSdk, SlackMessageType } from "@/utils/service/slackBotSdk";
import { SlackChannels, TMDSlackbot } from "@/utils/service/TMDSlackbotSdk";
import DatePicker from "@/components/App/Global/DatePicker";
import { FirebaseEvents, FirebaseSDK } from "@/utils/service/firebase";

export const ContactStep = ({ form, setForm }: StepParams) => {
  const [company, setCompany] = React.useState<string>("");

  const [submitType, setSubmitType] = React.useState<string>("google");
  const [requiredDields, setRequiredFields] = React.useState<any>({});
  const { loading, error, success, setLoading, setError, setSuccess } =
    useAsyncState();
  const { countryInfo } = useCountryInfo();
  const { signInWithSocial } = useAuthSession();
  const dispatch = useAppDispatch();
  const { logEventsFromQuery } = useCampaignAnalytics();

  const feedCickupData = (formData: FormInfo | undefined) => {
    // Operations
    const description = `${formData?.contact?.name} has signed up for a trial.`;
    const formEntries = formData
      ? Object.entries(formData)
          .map(([key, value]) => {
            if (value && typeof value !== "object") return `${key}: ${value}`;
          })
          .join("\n")
      : "";
    const taskName = `${formData?.contact?.name} | ${new Date()
      .toDateString()
      .slice(4)}`;
    const markdownDescription = `${formData?.contact?.name} | ${formData?.contact?.companyName} has signed up for the trial \n\nCompany Email : ${formData?.contact?.email} \nPhone Number: ${formData?.contact?.phone} \nTeam Size : ${formData?.teamSize} \nIndustry : ${formData?.industry}\nRequirement Type : ${formData?.requirementType}  \nPreferred Date: ${formData?.contact?.preferredDate}`;

    //Data
    const data = {
      name: taskName,
      description,
      markdown_description: markdownDescription,
      assignees: [183],
      status: "TO DO",
      priority: 3,
      due_date: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
      due_date_time: false,
      time_estimate: 8640000,
      start_date: new Date().getTime(),
      start_date_time: false,
      //     check_required_custom_fields: true,
      //     custom_fields: [
      //     {
      //         id: "12345",
      //         name: 'Client Info',
      //         type: 'text',
      //         value: markdownDescription
      //     }
      // ]
    };

    return data;
  };

  const handleValidation = (_form: any, submitType: string) => {
    //console.log(newRequiredFields);
    //setRequiredFields(fields);
    let isValid = true;
    let validations: any = {};
    if (submitType === "manual") {
      if ("name" in _form && _form["name"].trim().length <= 0) {
        isValid = false;
        validations.name = true;
      }
      if ("email" in _form && _form["email"].trim().length <= 0) {
        isValid = false;
        validations.email = true;
      }
    }
    if ("companyName" in _form && _form["companyName"].trim().length <= 0) {
      isValid = false;
      validations.companyName = true;
    }
    if ("preferredDate" in _form && _form["preferredDate"].trim().length <= 0) {
      validations.preferredDate = true;
      isValid = false;
    }
    setRequiredFields(validations);
    return isValid;
  };

  const sendEmailtoClient = async ({ clientEmail, clientName }: { clientEmail: string, clientName: string }) => {
    const bodyData = {
      sender: APP_INFO.no_reply_mail,
      recipient: clientEmail,
      displayName: "TheMoonDevs Team",
      subject: "Welcome to TheMoonDevs!",
      bodyHtml: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; background-color: #f0f0f0;">
        <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">Hey ${clientName},</h2>
          <p>Congratulations on signing up for a trial with us. We're over the moon to have you onboard!</p>
          <p>Our team will reach out soon to help you get started. In the meantime, if you have any questions or ideas to share, just drop us a line at <a href="mailto:contact@themoondevs.com" style="color: #000; text-decoration: none; font-weight: bold;">contact@themoondevs.com</a>.</p>
          <p>Excited to begin this journey with you!</p>
          <p>Best,</p>
          <p><strong>Team TheMoonDevs</strong></p>
        </div>
      </div>
    `,

    };
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
    });

    // console.log(response);

    const data = await response.json();
    console.log(data);
  };

  const updateFormToDB = async (formWithContactInfo: FormInfo) => {
    setLoading(true);
    setError({ isError: false, description: "" });

    const taskData = feedCickupData(formWithContactInfo);

    try {
      //Store form into db
      await MyServerApi.storeFormDataToDB(formWithContactInfo);

      // then call clickup api to create the task
      await ClickupApi.createTask(taskData, ListIds.MARKETING_LIST_TRACKER);

      FirebaseSDK.logEvents(FirebaseEvents.SURVEY_SUBMITTED);
      logEventsFromQuery();

      setLoading(false);

      // send the details to channel or user through the slack bot
      await TMDSlackbot.sendSlackMessageOnNewClient(
        {
          name: formWithContactInfo.contact?.name,
          email: formWithContactInfo.contact?.email,
          phone: formWithContactInfo.contact?.phone,
          companyName: formWithContactInfo.contact?.companyName,
          preferredDate: formWithContactInfo.contact?.preferredDate,
          industry: formWithContactInfo.industry,
          requirementType: formWithContactInfo.requirementType,
          teamSize: formWithContactInfo.teamSize,
        },
        SlackChannels.d_growth
      );

      if (formWithContactInfo.contact) {
        await sendEmailtoClient({
          clientEmail: formWithContactInfo.contact?.email,
          clientName: formWithContactInfo.contact?.name,
        });
      }

      setSuccess(true);

      //reset form after successful submission
      setForm({});
    } catch (error) {
      setError({ isError: true, description: (error as Error).message });
      dispatch(setGlobalToast(true));
      setLoading(false);
      setSuccess(false);
    }
  };

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString() || "";
    const name = formData.get("name")?.toString() || "";
    const phone = formData.get("phone")?.toString() || "";
    const companyName = formData.get("company")?.toString() || "";
    const preferredDate = formData.get("preferredDate")?.toString() || "";
    const contactInfo = { name, email, phone, companyName, preferredDate };

    let formWithContactInfo = { ...form, contact: contactInfo };
    setForm(formWithContactInfo);

    // first do validation checks
    const isValid = handleValidation(formWithContactInfo?.contact, submitType);
    console.log("isValid", isValid, formWithContactInfo?.contact, submitType);
    if (!isValid) return;

    // submit form if manual inputted.
    if (submitType === "manual") {
      updateFormToDB(formWithContactInfo);
      return;
    }

    try {
      setLoading(true);
      setError({ isError: false, description: "" });
      const user = await signInWithSocial();
      if (!user || !user.email) throw new Error("User email is empty");
      const email = user.email;
      const name = user.displayName || "";
      const googleContactInfo = { name, email };

      formWithContactInfo = {
        ...formWithContactInfo,
        contact: {
          ...formWithContactInfo.contact,
          ...googleContactInfo,
        },
      };
      updateFormToDB(formWithContactInfo);
    } catch (error) {
      setError({ isError: true, description: (error as Error).message });
      dispatch(setGlobalToast(true));
      setLoading(false);
      setSuccess(false);
    }
  };

  return (
    <StepStyled>
      <MoonToast
        message={`Error submitting form! Request failed with error: ${error.description}`}
        position={{ vertical: "top", horizontal: "center" }}
        severity="error"
        duration={3000}
      />
      <div className="card_list" style={{ justifyContent: "center" }}>
        {!success ? (
          <div className="contact_card">
            <div className="contact_heading">
              <h1>Start your trial</h1>
              <h2>Please fill in the details to claim your trial.</h2>
            </div>

            <form className="contact_form" onSubmit={handleFormSubmit}>
              <div className="flex flex-col w-full">
                {requiredDields.companyName && (
                  <span className=" flex justify-start text-xs text-red-500">
                    *Company Name is required
                  </span>
                )}
                <input
                  type="text"
                  id="company"
                  name="company"
                  placeholder="Company Name"
                  className="mt-1 p-2 border rounded-md"
                />
              </div>
              <div className="contact_form_phone">
                {countryInfo ? (
                  <Image
                    src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${countryInfo?.countryName}.svg`}
                    className="h-8 w-8 my-auto"
                    height={0}
                    width={20}
                    alt="Country Flag"
                  />
                ) : (
                  <span>
                    <Image
                      src={`/loading.svg`}
                      className="h-8 w-8 my-auto"
                      height={0}
                      width={20}
                      alt="Loading spinner"
                    />
                  </span>
                )}
                {countryInfo?.countryCode}
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="border-none"
                  placeholder="Phone Number"
                />
              </div>
              <div className="w-full">
                {requiredDields.preferredDate && (
                  <span className=" flex justify-start text-xs text-red-500">
                    *Preferred Date is required
                  </span>
                )}
                <DatePicker />
              </div>
              <input
                type="hidden"
                name="submitType"
                value={submitType}
                onChange={(e) => {}}
              />
              <Button
                type="submit"
                className="google_button"
                id="google"
                disabled={loading}
                startIcon={
                  submitType === "google" && loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : (
                    <Image
                      src={`/icons/google.svg`}
                      height={20}
                      width={20}
                      alt="Google Logo"
                    />
                  )
                }
                onClick={() => setSubmitType("google")}
              >
                Start with Google Email
              </Button>
              <span className="divider">or</span>
              {submitType === "manual" && (
                <div className="flex flex-col w-full">
                  <div className="flex flex-col">
                    {requiredDields.name && (
                      <span className=" flex justify-start text-xs text-red-500">
                        *Name is required
                      </span>
                    )}
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder="Your Name"
                    />
                  </div>
                  <div className="flex flex-col">
                    {requiredDields.name && (
                      <span className=" flex justify-start text-xs text-red-500">
                        *Email is required
                      </span>
                    )}
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="email@address.com"
                    />
                  </div>
                </div>
              )}
              <Button
                type="submit"
                startIcon={
                  submitType === "manual" && loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : (
                    <span className="material-symbols-outlined ms-regular">
                      alternate_email
                    </span>
                  )
                }
                className="trial_button"
                disabled={loading}
                onClick={() => setSubmitType("manual")}
              >
                Start with Custom Email
              </Button>
            </form>
          </div>
        ) : (
          <div className="contact_card">
            <div className="contact_heading">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "5rem" }}
              >
                task_alt
              </span>
              <h1>Thank you for your time!</h1>
              <h2>We&apos;ll be in touch soon.</h2>
            </div>
          </div>
        )}
      </div>
    </StepStyled>
  );
};

export default ContactStep;
