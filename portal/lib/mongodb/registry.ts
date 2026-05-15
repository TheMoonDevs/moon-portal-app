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
  candidate: { collection: 'Candidate', objectIdFields: ['jobPostId'] },
  jobPost: { collection: 'JobPost' },
  survey: { collection: 'Survey' },
  shortLink: { collection: 'ShortLink' },
  clientLeadForm: { collection: 'ClientLeadForm' },
  directoryList: {
    collection: 'DirectoryList',
    objectIdFields: ['parentDirId'],
    relations: {
      userDirectory: {
        model: 'userDirectory',
        localField: 'id',
        foreignField: 'directoryId',
        many: true,
      },
    },
  },
  userDirectory: {
    collection: 'UserDirectory',
    objectIdFields: ['directoryId', 'userId'],
    relations: {
      directoryData: {
        model: 'directoryList',
        localField: 'directoryId',
        foreignField: 'id',
        many: false,
      },
    },
  },
  userLink: {
    collection: 'UserLink',
    objectIdFields: ['linkId'],
    relations: {
      linkData: {
        model: 'link',
        localField: 'linkId',
        foreignField: 'id',
        many: false,
      },
    },
  },
  link: {
    collection: 'Links',
    objectIdFields: ['rootParentDirId', 'authorId', 'directoryId'],
    relations: {
      author: {
        model: 'user',
        localField: 'authorId',
        foreignField: 'id',
        many: false,
      },
    },
  },
  zeroRecords: { collection: 'ZeroRecords', objectIdFields: ['userId'] },
  workLogs: { collection: 'WorkLogs', objectIdFields: ['userId'] },
  certificate: {
    collection: 'Certificate',
    objectIdFields: ['userId', 'fileId'],
  },
  fileUpload: {
    collection: 'FileUpload',
    objectIdFields: ['userId', 'uploadedByUserId'],
  },
  configData: { collection: 'ConfigData' },
  article: { collection: 'Article' },
  docMarkdown: { collection: 'DocMarkdown' },
  notification: {
    collection: 'Notification',
    objectIdFields: ['userId', 'matchId'],
  },
  mission: { collection: 'Mission' },
  missionTask: { collection: 'MissionTask', objectIdFields: ['assignees'] },
  badgeTemplate: { collection: 'BadgeTemplate' },
  badgeRewarded: {
    collection: 'BadgeRewarded',
    objectIdFields: ['badgeTemplateId'],
  },
  pointer: {
    collection: 'Pointer',
    objectIdFields: ['userId', 'targetUserId'],
    relations: {
      replies: {
        model: 'reply',
        localField: 'id',
        foreignField: 'pointerId',
        many: true,
      },
    },
  },
  reply: { collection: 'Reply', objectIdFields: ['pointerId', 'userId'] },
  event: { collection: 'Event' },
  task: {
    collection: 'Task',
    idField: 'taskId',
    usesObjectIdId: false,
  },
  buffBadge: { collection: 'BuffBadge', objectIdFields: ['userId'] },
  subscription: { collection: 'Subscription', objectIdFields: ['userId'] },
  devProfile: { collection: 'DevProfile', objectIdFields: ['userId'] },
  clientUtilityLink: { collection: 'ClientUtilityLink' },
  engagement: { collection: 'Engagement' },
  botProject: {
    collection: 'BotProject',
    relations: {
      clientRequests: {
        model: 'clientRequest',
        localField: 'id',
        foreignField: 'botProjectId',
        many: true,
      },
    },
  },
  clientBotTemplate: { collection: 'ClientBotTemplate' },
  clientBot: {
    collection: 'ClientBot',
    objectIdFields: ['botProjectId', 'clientRequestIds'],
    relations: {
      botProject: {
        model: 'botProject',
        localField: 'botProjectId',
        foreignField: 'id',
        many: false,
      },
    },
  },
  clientRequestFunction: {
    collection: 'ClientRequestFunction',
    objectIdFields: ['botProjectId', 'originClientRequestId'],
  },
  clientRequest: {
    collection: 'ClientRequest',
    objectIdFields: ['botProjectId'],
    relations: {
      requestUpdates: {
        model: 'requestUpdate',
        localField: 'id',
        foreignField: 'originClientRequestId',
        many: true,
      },
      requestMessages: {
        model: 'requestMessage',
        localField: 'id',
        foreignField: 'originClientRequestId',
        many: true,
      },
      deployedFunctions: {
        model: 'clientRequestFunction',
        localField: 'id',
        foreignField: 'originClientRequestId',
        many: true,
      },
    },
  },
  requestUpdate: {
    collection: 'RequestUpdate',
    objectIdFields: ['originClientRequestId', 'botProjectId'],
  },
  requestMessage: {
    collection: 'RequestMessage',
    objectIdFields: ['originClientRequestId', 'clientId'],
  },
  invoice: { collection: 'Invoice' },
  emailSubscriber: { collection: 'EmailSubscriber' },
});

export type ModelName = keyof typeof modelMetaMap;
