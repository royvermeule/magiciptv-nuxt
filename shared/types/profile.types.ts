export type Profile = {
  id: number;
  name: string;
  hasPin: boolean;
};

export type ProfileFormData = {
  name: string;
  xtreamUsername: string;
  xtreamPassword: string;
  xtreamUrl: string;
  pin?: string;
};

export type ProfileEditData = {
  id: number;
  name: string;
  xtreamUsername?: string;
  xtreamPassword?: string;
  xtreamUrl?: string;
  pin?: string;
  newPin?: string;
  removePin?: boolean;
};
