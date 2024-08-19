"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_ROUTES } from "@/utils/constants/appInfo";
import { ArrowLeft, SquarePlus } from "lucide-react";
import { InputField, TextAreaField } from "./TextFields";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { Spinner } from "@/components/elements/Loaders";
import { useUser } from "@/utils/hooks/useUser";
import CriteriaFields from "./CriteriaFields";
import useBadgeForm from "@/utils/hooks/useBadgeForm";
import { useSearchParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Tooltip } from "@mui/material";
import ToolTip from "@/components/elements/ToolTip";

const BadgeEditor = () => {
  const { formData, handleChange, resetForm, getCriteria, setFormData } =
    useBadgeForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchedImg, setFetchedImg] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const query = useSearchParams();
  const id = query?.get("id");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchBadgeById = async (id: string) => {
      try {
        const response = await PortalSdk.getData(`/api/badges/${id}`, null);
        const badge = response.data;
        const fetchedData = {
          badgeName: badge.name,
          badgeDescription: badge.description,
          imageFile: null,
          criteriaType: badge.badgeType,
          ...badge.criteria,
        };
        setFormData(fetchedData);
        setFetchedImg(badge.imageurl);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching badge:", error);
        setLoading(false);
      }
    };

    setLoading(true);
    fetchBadgeById(id);
  }, [query, setFormData, id]);

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    if (user) {
      formData.append("userId", user.id);
    }
    try {
      const response = await fetch("/api/upload/file-upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      return data.fileInfo[0].fileUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const imageUrl = formData.imageFile
      ? await uploadImage(formData.imageFile as File)
      : fetchedImg;
    if (!imageUrl) {
      setIsSubmitting(false);
      return;
    }

    const badgeData = {
      badgeName: formData.badgeName,
      badgeDescription: formData.badgeDescription,
      badgeType: formData.criteriaType,
      imageurl: imageUrl,
      criteria: getCriteria(),
    };

    try {
      if (id) {
        await updateBadge(badgeData);
        setIsSubmitting(false);
        toast.success("Badge updated successfully");
      } else {
        const response = await PortalSdk.postData("/api/badges", badgeData);
        console.log("Badge saved successfully:", response.data);
        resetForm();
        setIsSubmitting(false);
        toast.success("Badge created successfully");
      }
    } catch (error) {
      console.error("Error saving badge:", error);
      setIsSubmitting(false);
      toast.error("Error saving badge");
    }
  };

  const updateBadge = async (badgeData: any) => {
    try {
      const response = await PortalSdk.putData(`/api/badges/${id}`, badgeData);
      console.log("Badge updated successfully:", response);
    } catch (error) {
      console.error("Error updating badge:", error);
    }
  };

  return (
    <div className="flex flex-col items-center p-8 bg-neutral-900 min-h-screen">
      <div className="w-full max-w-4xl bg-black rounded-lg shadow-lg p-8">
        <div className=" mb-6">
          <Link
            href={APP_ROUTES.admin}
            className="flex items-center text-white hover:text-gray-400"
          >
            <ArrowLeft className="text-lg mr-2" />
            Back to Admin Page
          </Link>
        </div>
        {loading && id ? (
          <div className="flex items-center justify-center w-full h-[80vh]">
            <Spinner />
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-white mb-6">
              {id ? "Update Badge" : "Create Badge"}
            </h1>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  id="badgeName"
                  type="text"
                  label="Badge Name"
                  placeholder="Enter badge name"
                  value={formData.badgeName}
                  onChange={handleChange}
                />
                <InputField
                  id="imageFile"
                  label="Image Upload"
                  type="file"
                  onChange={handleChange}
                  placeholder="Upload badge image"
                />
              </div>
              <TextAreaField
                id="badgeDescription"
                label="Description"
                placeholder="Enter badge description"
                value={formData.badgeDescription}
                onChange={handleChange}
              />
              <div className="flex flex-col">
                <label
                  htmlFor="criteriaType"
                  className="text-white font-semibold mb-2 flex items-center gap-2"
                >
                  Criteria Type
                  <ToolTip title="Choose the type of badge, such as time-based, streak-based, or custom">
                    <span className="material-symbols-outlined" style={{fontSize: '1rem'}}>info</span>
                  </ToolTip>
                </label>
                <select
                  id="criteriaType"
                  value={formData.criteriaType}
                  onChange={handleChange}
                  className="p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:ring-2 focus:ring-white transition"
                >
                  <option value="">Select Criteria Type</option>
                  <option value="TIME_BASED">Time-based</option>
                  <option value="STREAK">Streak-based</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <CriteriaFields
                criteriaType={formData.criteriaType}
                formData={formData}
                handleChange={handleChange}
              />
              <button
                type="submit"
                className={`bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 px-6 rounded-lg transition flex justify-center items-center ${
                  isSubmitting ? "cursor-not-allowed opacity-50" : ""
                } `}
                onClick={handleSubmit}
              >
                {!isSubmitting ? (
                  `${id ? "Update Badge" : "Save Badge"}`
                ) : (
                  <Spinner className="h-5 w-5 mr-2" />
                )}
              </button>
            </form>
          </>
        )}
      </div>
      <Toaster richColors duration={3000} closeButton position="bottom-left" />
    </div>
  );
};

export default BadgeEditor;
