export type RecipientMember = {
  id: string;
  label: string;
};

export type RecipientGroup = {
  id: string;
  name: string;
  members: RecipientMember[];
  updatedAt: string;
};

export type ShareDraft = {
  galleryIds: string[];
  recipientGroupIds: string[];
  customMessage: string;
  createdAt: string;
  updatedAt: string;
};

