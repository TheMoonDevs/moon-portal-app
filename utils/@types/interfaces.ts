export interface WorkLogPoints {
  project: string;
  project_icon: string;
  content: string;
  pointInfos: {
    text: string;
    status: string;
  }[];
}
