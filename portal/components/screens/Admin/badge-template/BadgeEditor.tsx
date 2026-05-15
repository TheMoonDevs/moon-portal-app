'use client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { Spinner } from '@/components/elements/Loaders';
import ToolTip from '@/components/elements/ToolTip';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import useBadgeForm from '@/utils/hooks/useBadgeForm';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import CriteriaFields from './CriteriaFields';
import { InputField, TextAreaField } from './TextFields';

const BadgeEditor = () => {
  const { formData, handleChange, resetForm, getCriteria, setFormData } =
    useBadgeForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchedImg, setFetchedImg] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const query = useSearchParams();
  const id = query?.get('id');

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
        console.error('Error fetching badge:', error);
        setLoading(false);
      }
    };

    setLoading(true);
    fetchBadgeById(id);
  }, [query, setFormData, id]);

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    if (user) {
      formData.append('userId', user.id);
    }
    try {
      const response = await fetch('/api/upload/file-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data.fileInfo[0].fileUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
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
        toast.success('Badge updated successfully');
      } else {
        const response = await PortalSdk.postData('/api/badges', badgeData);
        console.log('Badge saved successfully:', response.data);
        resetForm();
        setIsSubmitting(false);
        toast.success('Badge created successfully');
      }
    } catch (error) {
      console.error('Error saving badge:', error);
      setIsSubmitting(false);
      toast.error('Error saving badge');
    }
  };

  const updateBadge = async (badgeData: any) => {
    try {
      const response = await PortalSdk.putData(`/api/badges/${id}`, badgeData);
      console.log('Badge updated successfully:', response);
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-neutral-900 p-8">
      <div className="w-full max-w-4xl rounded-lg bg-black p-8 shadow-lg">
        <div className="mb-6">
          <Link
            href={APP_ROUTES.admin}
            className="flex items-center text-white hover:text-gray-400"
          >
            <ArrowLeft className="mr-2 text-lg" />
            Back to Admin Page
          </Link>
        </div>
        {loading && id ? (
          <div className="flex h-[80vh] w-full items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            <h1 className="mb-6 text-3xl font-bold text-white">
              {id ? 'Update Badge' : 'Create Badge'}
            </h1>
            <form className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                  className="mb-2 flex items-center gap-2 font-semibold text-white"
                >
                  Criteria Type
                  <ToolTip title="Choose the type of badge, such as time-based, streak-based, or custom">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '1rem' }}
                    >
                      info
                    </span>
                  </ToolTip>
                </label>
                <select
                  id="criteriaType"
                  value={formData.criteriaType}
                  onChange={handleChange}
                  className="rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-white transition focus:ring-2 focus:ring-white"
                >
                  <option value="">Select Criteria Type</option>
                  <option value="TIME_BASED">Time based</option>
                  <option value="STREAK">Streak based</option>
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
                className={`flex items-center justify-center rounded-lg bg-neutral-900 px-6 py-3 font-bold text-white transition hover:bg-neutral-800 ${
                  isSubmitting ? 'cursor-not-allowed opacity-50' : ''
                } `}
                onClick={handleSubmit}
              >
                {!isSubmitting ? (
                  `${id ? 'Update Badge' : 'Save Badge'}`
                ) : (
                  <Spinner className="mr-2 size-5" />
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
