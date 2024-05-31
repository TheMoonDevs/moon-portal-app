export enum LOGLINKTYPE {
  GENERAL = "general",
  ENGAGEMENT = "engagement",
  ABSTRACT = "abstract",
}

export interface WorkLogPoints {
  link_id: string;
  link_type: LOGLINKTYPE;
  icon: string;
  title: string;
  content: string;
}
