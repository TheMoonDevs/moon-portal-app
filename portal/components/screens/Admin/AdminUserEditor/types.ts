import type { User } from '@db/client';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';

/** Props every section of the user editor receives. */
export type UserSectionProps = {
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
  /** Handles inputs whose id maps to a field, `nested.field` included. */
  updateField: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  updateTextareaField: (e: ChangeEvent<HTMLTextAreaElement>) => void;
};
