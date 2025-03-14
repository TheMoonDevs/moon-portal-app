import { TMD_PORTAL_API_KEY } from '@/utils/constants/appInfo';
import { useUser } from '@/utils/hooks/useUser';
import { createImageUpload } from 'novel';
import { toast } from 'sonner';

export const useNovelImageUpload = () => {
  const { user } = useUser();
  const onUpload = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user!.id);
    formData.append('folderName', 'novel-editor');

    const promise = fetch('/api/upload/file-upload', {
      method: 'POST',
      body: formData,
      headers: {
        tmd_portal_api_key: TMD_PORTAL_API_KEY,
      },
    });

    return new Promise((resolve, reject) => {
      toast.promise(
        promise.then(async (res) => {
          if (res.status === 200) {
            const { fileInfo } = await res.json();
            if (fileInfo?.length > 0) {
              const fileUrl = fileInfo[0].fileUrl;

              // Preload the image
              const image = new Image();
              image.src = fileUrl;
              image.onload = () => resolve(fileUrl);
            } else {
              throw new Error('No file URL returned from API.');
            }
          } else {
            throw new Error('Error uploading file. Please try again.');
          }
        }),
        {
          loading: 'Uploading file...',
          success: 'File uploaded successfully.',
          error: (e) => {
            reject(e);
            return e.message;
          },
        },
      );
    });
  };

  const uploadFn = createImageUpload({
    onUpload,
    validateFn: (file) => {
      if (!file.type.includes('image/')) {
        toast.error('File type not supported.');
        return false;
      }
      if (file.size / 1024 / 1024 > 20) {
        toast.error('File size too big (max 20MB).');
        return false;
      }
      return true;
    },
  });

  return {
    uploadFn,
  };
};
