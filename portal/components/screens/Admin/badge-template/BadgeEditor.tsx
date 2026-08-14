/* eslint-disable @next/next/no-img-element */
'use client';

import { useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

import { APP_ROUTES } from '@/utils/constants/appInfo';
import useBadgeForm from '@/utils/hooks/useBadgeForm';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';

import { AdminEditorShell } from '../shared/AdminEditorShell';
import {
  AdminButton,
  Field,
  Icon,
  NativeSelect,
  Panel,
  PanelHeader,
  Pill,
  TextArea,
  TextInput,
} from '../shared/AdminUI';
import CriteriaFields from './CriteriaFields';

const CRITERIA_TYPES = [
  {
    value: 'TIME_BASED',
    label: 'Time based',
    hint: 'Unlocks a set period after the member joins.',
  },
  {
    value: 'STREAK',
    label: 'Streak based',
    hint: 'Unlocks after a run of consecutive active days.',
  },
  {
    value: 'CUSTOM',
    label: 'Custom',
    hint: 'Awarded manually by an admin.',
  },
];

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
    const fetchBadgeById = async (badgeId: string) => {
      try {
        const response = await PortalSdk.getData(
          `/api/badges/${badgeId}`,
          null,
        );
        const badge = response.data;
        setFormData({
          badgeName: badge.name,
          badgeDescription: badge.description,
          imageFile: null,
          criteriaType: badge.badgeType,
          streakType: '',
          streakTitle: '',
          streakCount: '',
          criteriaLogic: '',
          customTitle: '',
          customDescription: '',
          ...badge.criteria,
        });
        setFetchedImg(badge.imageurl);
      } catch (error) {
        console.error('Error fetching badge:', error);
        toast.error('Could not load this badge');
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchBadgeById(id);
  }, [setFormData, id]);

  /* Preview the selected file before it is uploaded. */
  const localPreview = useMemo(() => {
    if (!formData.imageFile) return '';
    return URL.createObjectURL(formData.imageFile as File);
  }, [formData.imageFile]);

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  const previewImage = localPreview || fetchedImg;

  const uploadImage = async (file: File) => {
    const body = new FormData();
    body.append('file', file);
    if (user) body.append('userId', user.id);

    const response = await fetch('/api/upload/file-upload', {
      method: 'POST',
      body,
    });
    if (!response.ok) throw new Error('Image upload failed');
    const data = await response.json();
    return data?.fileInfo?.[0]?.fileUrl || '';
  };

  const criteriaComplete =
    formData.criteriaType === 'TIME_BASED'
      ? formData.criteriaLogic.trim() !== ''
      : formData.criteriaType === 'STREAK'
        ? formData.streakType !== '' && String(formData.streakCount) !== ''
        : formData.criteriaType === 'CUSTOM';

  const isValid =
    formData.badgeName.trim() !== '' &&
    formData.badgeDescription.trim() !== '' &&
    !!(formData.imageFile || fetchedImg) &&
    criteriaComplete;

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const imageUrl = formData.imageFile
        ? await uploadImage(formData.imageFile as File)
        : fetchedImg;
      if (!imageUrl) throw new Error('No badge image available');

      const badgeData = {
        badgeName: formData.badgeName,
        badgeDescription: formData.badgeDescription,
        badgeType: formData.criteriaType,
        imageurl: imageUrl,
        criteria: getCriteria(),
      };

      if (id) {
        await PortalSdk.putData(`/api/badges/${id}`, badgeData);
        setFetchedImg(imageUrl);
        toast.success('Badge updated');
      } else {
        await PortalSdk.postData('/api/badges', badgeData);
        resetForm();
        setFetchedImg('');
        toast.success('Badge created');
      }
    } catch (error) {
      console.error('Error saving badge:', error);
      toast.error(
        id ? 'Could not update the badge' : 'Could not create the badge',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AdminEditorShell
        backHref={`${APP_ROUTES.admin}?tab=badges`}
        backLabel="Badges"
        title={id ? 'Edit badge' : 'New badge'}
        description="Badges are achievements members unlock on their profile."
        meta={
          formData.criteriaType ? (
            <Pill tone="warning">
              {CRITERIA_TYPES.find(
                (type) => type.value === formData.criteriaType,
              )?.label ?? formData.criteriaType}
            </Pill>
          ) : undefined
        }
        actions={
          <AdminButton
            tone="primary"
            icon="check"
            loading={isSubmitting}
            disabled={loading || !isValid}
            onClick={() => handleSubmit()}
          >
            {id ? 'Save badge' : 'Create badge'}
          </AdminButton>
        }
      >
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="h-96 animate-pulse rounded-2xl bg-white/[0.03] lg:col-span-3" />
            <div className="h-64 animate-pulse rounded-2xl bg-white/[0.03] lg:col-span-2" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-5">
            <div className="flex flex-col gap-4 lg:col-span-3">
              <Panel>
                <PanelHeader
                  title="Badge details"
                  description="Name and description shown to members."
                  icon="workspace_premium"
                />
                <div className="flex flex-col gap-4 p-4">
                  <Field label="Badge name" htmlFor="badgeName" required>
                    <TextInput
                      id="badgeName"
                      value={formData.badgeName}
                      onChange={handleChange}
                      placeholder="e.g. Six month streak"
                    />
                  </Field>

                  <Field
                    label="Description"
                    htmlFor="badgeDescription"
                    required
                  >
                    <TextArea
                      id="badgeDescription"
                      value={formData.badgeDescription}
                      onChange={handleChange}
                      placeholder="What does earning this badge mean…"
                    />
                  </Field>
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Unlock criteria"
                  description="How members earn this badge."
                  icon="rule"
                />
                <div className="flex flex-col gap-4 p-4">
                  <Field
                    label="Criteria type"
                    htmlFor="criteriaType"
                    required
                    hint={
                      CRITERIA_TYPES.find(
                        (type) => type.value === formData.criteriaType,
                      )?.hint
                    }
                  >
                    <NativeSelect
                      id="criteriaType"
                      value={formData.criteriaType}
                      onChange={handleChange}
                    >
                      <option value="">Select a criteria type…</option>
                      {CRITERIA_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>

                  <CriteriaFields
                    criteriaType={formData.criteriaType}
                    formData={formData}
                    handleChange={handleChange}
                  />
                </div>
              </Panel>
            </div>

            {/* Artwork & preview */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              <Panel>
                <PanelHeader
                  title="Artwork"
                  description="Wide images work best."
                  icon="image"
                />
                <div className="flex flex-col gap-3 p-4">
                  <label
                    htmlFor="imageFile"
                    className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center transition-colors hover:border-white/30 hover:bg-white/[0.05]"
                  >
                    <Icon
                      name="upload_file"
                      className="text-[26px] text-neutral-500"
                    />
                    <span className="text-sm text-neutral-300">
                      {formData.imageFile
                        ? (formData.imageFile as File).name
                        : previewImage
                          ? 'Replace the badge image'
                          : 'Choose a badge image'}
                    </span>
                    <span className="text-xs text-neutral-600">
                      PNG or JPG, click to browse
                    </span>
                  </label>
                  <input
                    id="imageFile"
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleChange}
                  />
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Preview"
                  description="How the badge appears in the list."
                  icon="visibility"
                />
                <div className="p-4">
                  <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
                    <div className="aspect-[5/2] w-full bg-neutral-900">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt={formData.badgeName || 'Badge preview'}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[28px] text-neutral-700">
                          <Icon name="workspace_premium" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="truncate text-sm font-semibold text-neutral-100">
                        {formData.badgeName || 'Badge name'}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                        {formData.badgeDescription ||
                          'The badge description appears here.'}
                      </p>
                    </div>
                  </div>

                  {!isValid && (
                    <p className="mt-3 flex items-start gap-1.5 text-xs text-neutral-500">
                      <Icon name="info" className="mt-px text-[14px]" />
                      Add a name, description, image and complete criteria to
                      save.
                    </p>
                  )}
                </div>
              </Panel>
            </div>
          </form>
        )}
      </AdminEditorShell>

      <Toaster
        theme="dark"
        richColors
        duration={3000}
        closeButton
        position="bottom-right"
      />
    </>
  );
};

export default BadgeEditor;
