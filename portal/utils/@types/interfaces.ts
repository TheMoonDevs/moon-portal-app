export enum LOGLINKTYPE {
  GENERAL = "general",
  ENGAGEMENT = "engagement",
  ABSTRACT = "abstract",
  /** A section for one project; its lines belong to that project. */
  PROJECT = "project",
}

export interface WorkLogPoints {
  link_id: string;
  link_type: LOGLINKTYPE;
  icon: string;
  title: string;
  content: string;
}
