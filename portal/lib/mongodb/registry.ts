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
  workLogs: { collection: 'WorkLogs', objectIdFields: ['userId'] },
  docMarkdown: { collection: 'DocMarkdown' },
  task: { collection: 'Task', idField: 'taskId', usesObjectIdId: false },
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
  badgeTemplate: { collection: 'BadgeTemplate' },
  badgeRewarded: {
    collection: 'BadgeRewarded',
    objectIdFields: ['badgeTemplateId'],
  },
  buffBadge: { collection: 'BuffBadge', objectIdFields: ['userId'] },
  notification: {
    collection: 'Notification',
    objectIdFields: ['userId', 'matchId'],
  },
  subscription: { collection: 'Subscription', objectIdFields: ['userId'] },
  event: { collection: 'Event' },
  fileUpload: {
    collection: 'FileUpload',
    objectIdFields: ['userId', 'uploadedByUserId'],
  },
  shortLink: { collection: 'ShortLink' },
  configData: { collection: 'ConfigData' },
});

export type ModelName = keyof typeof modelMetaMap;
