'use client';
import Input from '@/components/elements/Input';
import { SOCIALLINK } from '@prisma/client';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { linkRegex } from '.';
import Link from 'next/link';

const defaultFields = {
  platform: '',
  link: '',
};

const SocialLinksForm = () => {
  const { setValue, watch } = useFormContext();
  const [socialLinks, setSocialLinks] = useState(defaultFields);
  const socialLinksValues = watch('socialLinks');

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!socialLinks.platform || !socialLinks.link) {
      toast.error('Please fill in both the fields to add social link.');
      return;
    }
    if (!linkRegex.test(socialLinks.link)) {
      toast.error('Please provide a valid URL for the link.');
      return;
    }
    const updatedSocialLinks = [...(socialLinksValues || []), socialLinks];
    setValue('socialLinks', updatedSocialLinks);
    setSocialLinks(defaultFields);
  };

  const handleDelete = (index: number) => {
    const updatedSocialLinks = socialLinksValues.filter(
      (_: SOCIALLINK, i: number) => i !== index,
    );
    setValue('socialLinks', updatedSocialLinks);
  };

  return (
    <div className="min-h-[400px]">
      <form className="flex w-full flex-row items-center gap-2 max-md:flex-col max-md:gap-0">
        <Input
          id="platform"
          label="Platform"
          value={socialLinks.platform}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSocialLinks({ ...socialLinks, platform: e.target.value })
          }
        />
        <Input
          id="link"
          label="Link"
          value={socialLinks.link}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSocialLinks({ ...socialLinks, link: e.target.value })
          }
        />
        <button
          className="mt-[6px] w-full cursor-pointer rounded-lg bg-black p-[9px] text-sm text-white transition duration-300 ease-in-out"
          onClick={handleAdd}
        >
          Add
        </button>
      </form>

      <div className="mt-4">
        {socialLinksValues.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1 max-sm:gap-1">
            {socialLinksValues.map((link: SOCIALLINK, index: number) => (
              <div
                key={index}
                className="mb-2 flex items-center justify-between rounded-lg border bg-gray-100 p-2"
              >
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="material-symbols-outlined !text-base !text-gray-500">
                    link
                  </span>
                  <span className="font-semibold">{link.platform}</span>
                </div>
                <button
                  onClick={() => handleDelete(index)}
                  className="flex items-center justify-center text-red-500 transition duration-300 hover:text-red-700"
                >
                  <span className="material-symbols-outlined">cancel</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="my-10 flex h-full flex-col items-center justify-center text-gray-500">
            <span className="material-symbols-outlined !text-8xl !opacity-80">
              link
            </span>
            <span className="mt-2 text-center text-lg">No Links Added</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialLinksForm;
