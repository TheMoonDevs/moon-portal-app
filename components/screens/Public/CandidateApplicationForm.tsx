"use client";

import { useEffect, useState } from "react";
import { CircularProgress } from "@mui/material";
import Image from "next/image";

import { Button } from "@/components/elements/Button";
import { MoonToast } from "@/components/elements/Toast";

import { useAppDispatch } from "@/utils/redux/store";
import { setGlobalToast } from "@/utils/redux/ui/ui.slice";
import { PortalSdk } from "@/utils/services/PortalSdk";
import useAsyncState from "@/utils/hooks/useAsyncState";

interface JobSummary {
  title: string;
  description: string;
  status: string;
  jobpost: string;
}

export const CandidateApplicationForm = ({ jobID }: { jobID: string }) => {
  const dispatch = useAppDispatch();

  const { loading, error, success, setLoading, setSuccess, setError } =
    useAsyncState();
  const [jobSummary, setJobSummary] = useState<JobSummary | null>(null);
  const [pageLoadingError, setPageLoadingError] = useState({
    isError: false,
    description: "",
  });
  const [pageLoading, setPageLoading] = useState(true);

  const questions = [
    {
      question:
        "Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const firstName = formData.get("firstName") || "";
    const lastName = formData.get("lastName") || "";
    const email = formData.get("email") || "";
    const mobileNumber = formData.get("mobileNumber") || "";
    const portfolioLink = formData.get("portfolioLink") || "";
    const answers = formData.getAll("answer") || [];

    const candidateQuestionResponse = questions.map((question, index) => ({
      question: question.question,
      answer: answers[index] || "",
    }));

    const data = {
      name: `${firstName} ${lastName}`,
      email,
      mobileNumber: Number(mobileNumber) || mobileNumber,
      portfolio: portfolioLink,
      applicantAnswers: candidateQuestionResponse,
      jobPostId: jobID,
    };

    try {
      const response = await PortalSdk.postData("/api/candidate", { data });

      setError({ isError: false, description: "" });
      setLoading(false);
      setSuccess(true);
    } catch (error: any) {
      setError({ isError: true, description: error?.message || error });
      dispatch(setGlobalToast(true));
      setSuccess(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const response = await PortalSdk.getData(
          `/api/jobPost/jobById/${jobID}`,
          null
        );
        setJobSummary(response);
        setPageLoading(false);
      } catch (error: any) {
        setPageLoadingError({
          isError: true,
          description: `${error.status} ${error.statusText}`,
        });
        setPageLoading(false);
      }
    };
    fetchJobData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobID]);

  if (pageLoading && jobSummary === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress color="inherit" />
      </div>
    );
  } else {
    if (pageLoadingError.isError) {
      return (
        <div
          className="flex justify-center items-center h-screen  
      "
        >
          <span className="text-white bg-red-400 rounded-sm p-6">
            {pageLoadingError.description}!
          </span>
        </div>
      );
    }

    if (success) {
      return (
        <div>
          <div className="flex flex-col gap-4 justify-center items-center h-screen">
            <span className="material-icons-outlined !text-6xl">task_alt</span>
            <h1 className="text-3xl md:text-4xl font-bold">
              Thank you for applying!
            </h1>
            <span className="text-gray-600 text-center md:pl-3 font-normal">
              Job ID: {jobID}
            </span>
          </div>
        </div>
      );
    }
    return (
      <div>
        <MoonToast
          message={
            `Something went wrong! Request denied with status code ${error.description}` ||
            "Something went wrong!"
          }
          position={{ vertical: "top", horizontal: "left" }}
          severity="error"
        />
        <div className="flex p-6 px-8 border-b-2 md:divide-x-2 gap-3 items-center md:flex-nowrap flex-wrap">
          <div className="flex gap-3 items-center">
            <Image
              src="/logo/logo.png"
              alt="The Moon Devs"
              width={36}
              height={36}
            />
            <h1 className="text-xl md:text-xl tracking-[0.25rem] uppercase font-light">
              The Moon Devs
            </h1>
          </div>
          <span className="text-gray-600 text-center md:pl-3 font-normal text-sm">
            Job ID: {jobID}
          </span>
        </div>

        {/* Job Summary */}
        <div className="flex flex-col md:flex md:flex-row md:gap-10 md:p-8 bg-gray-100">
          <div className="w-full md:max-w-md p-8 md:p-10 md:rounded-lg md:shadow-md bg-white self-start max-h-fit">
            <h2 className="text-2xl font-bold text-gray-800">
              {jobSummary?.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600 ">
              Location: Bangalore, India
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Position: {jobSummary?.jobpost}
            </p>
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-semibold text-gray-700 ">
                Job Details:
              </h3>
              <p className="text-sm text-gray-600 ">
                {jobSummary?.description}
              </p>
            </div>
          </div>
          {/* Application Form */}
          <form
            className="flex flex-col gap-10 rounded-md md:p-10 p-8 bg-white"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-3 ">
              <p className=" text-lg font-semibold">Personal Details</p>
              <div className="flex flex-col space-y-4">
                <div className="flex flex-row gap-4 flex-wrap lg:flex-nowrap">
                  <div className="flex flex-col w-full">
                    <label className="text-sm font-medium">First Name</label>
                    <input
                      required
                      type="text"
                      name="firstName"
                      className="mt-1 p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex flex-col w-full">
                    <label className=" text-sm font-medium">Last Name</label>
                    <input
                      required
                      type="text"
                      name="lastName"
                      className="mt-1 p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex flex-row gap-4 flex-wrap lg:flex-nowrap">
                  <div className="flex flex-col w-full">
                    <label className="text-sm  font-medium">Email</label>
                    <input
                      required
                      type="email"
                      name="email"
                      className="mt-1 p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex flex-col w-full">
                    <label className="text-sm font-medium">Mobile Number</label>
                    <input
                      required
                      type="tel"
                      name="mobileNumber"
                      pattern="[0-9]*"
                      minLength={10}
                      maxLength={12}
                      title="Enter a valid 10 digit number."
                      inputMode="numeric"
                      className="mt-1 p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-lg font-semibold">
                Portfolio Link (optional)
              </label>
              <input
                placeholder="https://example.com"
                type="url"
                name="portfolioLink"
                className="mt-1 p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex flex-col">
              <p className="text-lg font-semibold">
                Please answer the following questions
              </p>
              {questions.map((question, index) => (
                <div className="flex flex-col gap-3 mt-4" key={index}>
                  <label className=" font-medium">{question.question}</label>
                  <textarea
                    name="answer"
                    className="mt-1 p-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              ))}
            </div>
            <div className="w-full">
              <Button disabled={loading} type="submit">
                {loading && <CircularProgress color="inherit" size={20} />}
                Submit
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }
};
