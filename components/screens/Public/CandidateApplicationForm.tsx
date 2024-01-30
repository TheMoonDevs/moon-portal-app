"use client";

import { Button } from "@/components/elements/Button";
import { Spinner } from "@/components/elements/Loaders";
import { useState } from "react";

export const CandidateApplicationForm = () => {
  const questions = [
    {
      question:
        "Q. Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Q. Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Q. Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Q. Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Q. Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Q. Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Q. Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
    {
      question:
        "Q. Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate modi fugiat eius, tenetur error pariatur assumenda?",
      answer: "",
    },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const firstName = formData.get("firstName") || "";
    const lastName = formData.get("lastName") || "";
    const email = formData.get("email") || "";
    const mobileNumber = formData.get("mobileNumber") || "";
    const portfolioLink = formData.get("portfolioLink") || "";
    const answers = formData.getAll("answer") || [];
    const response = questions.map((question, index) => ({
      question: question.question,
      answer: answers[index] || "",
    }));

    const data = {
      firstName,
      lastName,
      email,
      mobileNumber,
      portfolioLink,
      response,
    };

    console.log(data);
  };

  const [loading, setLoading] = useState(false);

  return (
    <div>
      <h1 className="text-4xl font-bold p-6 px-8 ">Application Form</h1>
      {/* Job Summary */}
      <div className="flex gap-10 p-8 bg-gray-100">
        <div className="w-full max-w-md p-6 rounded-lg shadow-md bg-white max-h-[40vh]">
          <h2 className="text-2xl font-bold text-gray-800">
            Software Engineer
          </h2>
          <p className="mt-2 text-sm text-gray-600 ">
            Location: San Francisco, CA
          </p>
          <p className="mt-2 text-sm text-gray-600 ">Position: Full-time</p>
          <div className="mt-4 space-y-2">
            <h3 className="text-lg font-semibold text-gray-700 ">
              Job Details:
            </h3>
            <p className="text-sm text-gray-600 ">
              We are looking for a skilled software engineer with experience in
              building scalable applications using modern technologies. The
              ideal candidate should have a strong understanding of software
              development principles and be able to work in a fast-paced
              environment.
            </p>
          </div>
        </div>
        {/* Application Form */}
        <form
          className="flex flex-col gap-10 rounded-md  p-6 bg-white"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-3 ">
            <p className=" text-lg font-semibold">Name</p>
            <div className="flex flex-row space-x-4">
              <div className="flex flex-col w-full">
                <label className="text-sm font-medium">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  className="mt-1 p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex flex-col w-full">
                <label className=" text-sm font-medium">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  className="mt-1 p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className=" text-lg font-semibold">Contact</p>
            <div className="flex flex-row space-x-4">
              <label className="flex flex-col text-sm w-full font-medium">
                Email
                <input
                  type="text"
                  name="email"
                  className="mt-1 p-2 border border-gray-300 rounded-md"
                />
              </label>

              <label className="flex flex-col text-sm w-full font-medium">
                Mobile Number
                <input
                  type="text"
                  name="mobileNumber"
                  className="mt-1 p-2 border border-gray-300 rounded-md"
                />
              </label>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-lg font-semibold">Portfolio Link</label>
            <input
              type="text"
              name="portfolioLink"
              className="mt-1 p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-semibold mb-3">
              Please answer the following questions
            </p>
            {questions.map((question, index) => (
              <div className="flex flex-col gap-3" key={index}>
                <label className=" font-medium">{question.question}</label>
                <input
                  type="text"
                  name="answer"
                  className="mt-1 p-2 border border-gray-300 rounded-md"
                />
              </div>
            ))}
            {/* <label className=" font-medium">
              Q. Lorem ipsum dolor, repellendus quam quos ducimus id, cupiditate
              modi fugiat eius, tenetur error pariatur assumenda?
            </label>
            <input
              type="text"
              name="answer"
              className="mt-1 p-2 border border-gray-300 rounded-md"
            /> */}
          </div>
          <div className=" w-1/3">
            <Button
              // onClick={handleFormSubmit}
              className="flex flex-row items-center gap-2 w-1/4"
            >
              {loading && (
                <Spinner className="w-3 h-3 fill-green-400 text-green-600" />
              )}
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
