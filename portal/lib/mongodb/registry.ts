export type RelationMeta = {
  model: string;
  localField: string;
  foreignField: string;
  many: boolean;
};

export type ModelMeta = {
  model: string;
  collection: string;
  idField: string;
  objectIdFields: Set<string>;
  relations?: Record<string, RelationMeta>;
};

type ModelDefinition = {
  collection: string;
  // defaults to "id"
  idField?: string;
  // when false, id field is not auto-treated as ObjectId
  usesObjectIdId?: boolean;
  objectIdFields?: string[];
  relations?: Record<string, RelationMeta>;
};

function defineModelRegistry<T extends Record<string, ModelDefinition>>(
  defs: T,
) {
  const out = {} as Record<keyof T, ModelMeta>;

  for (const [model, def] of Object.entries(defs) as Array<
    [keyof T, T[keyof T]]
  >) {
    const idField = def.idField ?? 'id';
    const usesObjectIdId = def.usesObjectIdId ?? true;
    const objectIdFields = new Set(def.objectIdFields ?? []);
    if (usesObjectIdId) objectIdFields.add(idField);

    out[model] = {
      model: String(model),
      collection: def.collection,
      idField,
      objectIdFields,
      relations: def.relations,
    };
  }

  return out;
}

export const modelMetaMap = defineModelRegistry({
  user: { collection: 'User' },
  role: { collection: 'Role' },
  workLogs: { collection: 'WorkLogs', objectIdFields: ['userId'] },
  docMarkdown: { collection: 'DocMarkdown' },
  notification: {
    collection: 'Notification',
    objectIdFields: ['userId', 'matchId'],
  },
  subscription: { collection: 'Subscription', objectIdFields: ['userId'] },
  fileUpload: {
    collection: 'FileUpload',
    objectIdFields: ['userId', 'uploadedByUserId'],
  },
  configData: { collection: 'ConfigData' },
  company: { collection: 'Company' },
  companyRole: { collection: 'CompanyRole' },
  companyMember: { collection: 'CompanyMember' },
  project: { collection: 'Project' },
  projectRequest: { collection: 'ProjectRequest' },
  task: { collection: 'Task' },
  workPoint: { collection: 'WorkPoint' },
  taskSchedule: { collection: 'TaskSchedule' },
  goalTally: { collection: 'GoalTally' },
  projectResult: { collection: 'ProjectResult' },
  plan: { collection: 'Plan' },
  projectPage: { collection: 'ProjectPage' },
  apiToken: { collection: 'ApiToken' },
  oauthClient: { collection: 'OAuthClient' },
  oauthCode: { collection: 'OAuthCode' },
  pointEntry: { collection: 'PointEntry' },
  badge: { collection: 'Badge' },
  userBadge: { collection: 'UserBadge' },
  jobOpening: { collection: 'JobOpening' },
  jobApplication: { collection: 'JobApplication' },
  hiringEmailTemplate: { collection: 'HiringEmailTemplate' },
  hiringEmail: { collection: 'HiringEmail' },
  meetProfile: { collection: 'MeetProfile' },
  meetBooking: { collection: 'MeetBooking' },
});

export type ModelName = keyof typeof modelMetaMap;
