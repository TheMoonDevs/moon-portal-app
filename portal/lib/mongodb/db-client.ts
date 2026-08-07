import mongoose from 'mongoose';

import {
  getMongoDb,
  serializeMongoDoc,
  toObjectIdIfNeeded,
} from '@/lib/db/mongoose';
import { type ModelMeta, modelMetaMap } from '@/lib/mongodb/registry';

type Db = any;
type ClientSession = any;

type AnyDoc = Record<string, any>;
type QueryArgs = {
  where?: AnyDoc;
  select?: AnyDoc;
  include?: AnyDoc;
  orderBy?: AnyDoc | AnyDoc[];
  skip?: number;
  take?: number;
  data?: AnyDoc;
};

function withMongoId(
  meta: ModelMeta,
  input?: AnyDoc,
  forFilter = false,
): AnyDoc {
  const obj = { ...(input ?? {}) };
  if (meta.idField === 'id' && 'id' in obj) {
    const raw = obj.id;
    const converted = convertField(meta, 'id', raw);
    if (forFilter && converted instanceof mongoose.Types.ObjectId) {
      // Emit $in to match both ObjectId and plain-string _id — handles documents
      // where @db.ObjectId was declared in Prisma but _id landed as a string
      // after migration (or vice versa).
      obj._id = { $in: [converted, String(raw)] };
    } else {
      obj._id = converted;
    }
    delete obj.id;
  }
  if (meta.idField !== 'id' && meta.idField in obj) {
    obj._id = convertField(meta, meta.idField, obj[meta.idField]);
    delete obj[meta.idField];
  }
  return obj;
}

function convertField(meta: ModelMeta, key: string, value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => convertField(meta, key, v));
  }
  if (meta.objectIdFields.has(key)) {
    return toObjectIdIfNeeded(value);
  }
  return value;
}

function buildFilter(meta: ModelMeta, where?: AnyDoc): AnyDoc {
  const src = withMongoId(meta, where, true);
  if (!src || typeof src !== 'object') return {};
  const out: AnyDoc = {};

  for (const [key, value] of Object.entries(src)) {
    if (key === 'OR' && Array.isArray(value)) {
      out.$or = value.map((item) => buildFilter(meta, item));
      continue;
    }
    if (key === 'AND' && Array.isArray(value)) {
      out.$and = value.map((item) => buildFilter(meta, item));
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const opObj = value as AnyDoc;
      const hasOperators = [
        'equals',
        'contains',
        'startsWith',
        'endsWith',
        'in',
        'notIn',
        'gt',
        'gte',
        'lt',
        'lte',
        'has',
      ].some((k) => k in opObj);
      if (hasOperators) {
        const opFilter: AnyDoc = {};
        if ('equals' in opObj)
          opFilter.$eq = convertField(meta, key, opObj.equals);
        if ('in' in opObj && Array.isArray(opObj.in))
          opFilter.$in = convertField(meta, key, opObj.in);
        if ('notIn' in opObj && Array.isArray(opObj.notIn))
          opFilter.$nin = convertField(meta, key, opObj.notIn);
        if ('gt' in opObj) opFilter.$gt = convertField(meta, key, opObj.gt);
        if ('gte' in opObj) opFilter.$gte = convertField(meta, key, opObj.gte);
        if ('lt' in opObj) opFilter.$lt = convertField(meta, key, opObj.lt);
        if ('lte' in opObj) opFilter.$lte = convertField(meta, key, opObj.lte);
        if ('has' in opObj) opFilter.$in = [convertField(meta, key, opObj.has)];
        if ('contains' in opObj) {
          opFilter.$regex = String(opObj.contains);
          opFilter.$options = opObj.mode === 'insensitive' ? 'i' : '';
        }
        if ('startsWith' in opObj) {
          opFilter.$regex = `^${String(opObj.startsWith)}`;
          opFilter.$options = opObj.mode === 'insensitive' ? 'i' : '';
        }
        if ('endsWith' in opObj) {
          opFilter.$regex = `${String(opObj.endsWith)}$`;
          opFilter.$options = opObj.mode === 'insensitive' ? 'i' : '';
        }
        out[key] = opFilter;
        continue;
      }
    }
    out[key] = convertField(meta, key, value);
  }

  return out;
}

function toProjection(meta: ModelMeta, select?: AnyDoc): AnyDoc | undefined {
  if (!select) return undefined;
  const projection: AnyDoc = {};
  for (const [key, val] of Object.entries(select)) {
    if (!val) continue;
    projection[key === 'id' ? '_id' : key] = 1;
  }
  if (meta.idField === 'id') projection._id = 1;
  return projection;
}

function toSort(orderBy?: AnyDoc | AnyDoc[]): AnyDoc | undefined {
  if (!orderBy) return undefined;
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sort: AnyDoc = {};
  for (const clause of clauses) {
    for (const [k, v] of Object.entries(clause)) {
      sort[k === 'id' ? '_id' : k] = v === 'asc' ? 1 : -1;
    }
  }
  return sort;
}

function normalizeDoc(meta: ModelMeta, raw: AnyDoc | null): AnyDoc | null {
  if (!raw) return null;
  const serialized = serializeMongoDoc(raw);
  const result: AnyDoc = { ...serialized };
  if (meta.idField === 'id') {
    result.id = serialized._id ?? serialized.id;
    delete result._id;
  } else {
    result[meta.idField] = serialized._id ?? serialized[meta.idField];
    delete result._id;
  }
  return result;
}

async function applyInclude(
  db: Db,
  meta: ModelMeta,
  doc: AnyDoc,
  include?: AnyDoc,
): Promise<AnyDoc> {
  if (!include || !meta.relations || !doc) return doc;
  const next = { ...doc };
  for (const [key, includeValue] of Object.entries(include)) {
    const relation = meta.relations[key];
    if (!relation || !includeValue) continue;
    const targetMeta =
      modelMetaMap[relation.model as keyof typeof modelMetaMap];
    const targetCol = db.collection(targetMeta.collection);
    const localValue = doc[relation.localField];
    if (localValue == null) {
      next[key] = relation.many ? [] : null;
      continue;
    }

    const relationWhere =
      typeof includeValue === 'object'
        ? (includeValue as AnyDoc).where
        : undefined;
    const relationSelect =
      typeof includeValue === 'object'
        ? (includeValue as AnyDoc).select
        : undefined;
    const relationOrderBy =
      typeof includeValue === 'object'
        ? (includeValue as AnyDoc).orderBy
        : undefined;
    const relationTake =
      typeof includeValue === 'object'
        ? (includeValue as AnyDoc).take
        : undefined;
    const relationInclude =
      typeof includeValue === 'object'
        ? (includeValue as AnyDoc).include
        : undefined;

    const baseWhere = buildFilter(targetMeta, {
      [relation.foreignField]: localValue,
      ...(relationWhere ?? {}),
    });
    const projection = toProjection(targetMeta, relationSelect);
    const sort = toSort(relationOrderBy);

    if (relation.many) {
      let cursor = targetCol.find(
        baseWhere,
        projection ? { projection } : undefined,
      );
      if (sort) cursor = cursor.sort(sort);
      if (typeof relationTake === 'number') cursor = cursor.limit(relationTake);
      const docs = await cursor.toArray();
      let mapped = docs
        .map((d: AnyDoc) => normalizeDoc(targetMeta, d))
        .filter(Boolean) as AnyDoc[];
      if (relationInclude) {
        mapped = await Promise.all(
          mapped.map((item) =>
            applyInclude(db, targetMeta, item, relationInclude),
          ),
        );
      }
      next[key] = mapped;
    } else {
      const found = await targetCol.findOne(
        baseWhere,
        projection ? { projection } : undefined,
      );
      const normalized = normalizeDoc(targetMeta, found);
      next[key] =
        relationInclude && normalized
          ? await applyInclude(db, targetMeta, normalized, relationInclude)
          : normalized;
    }
  }
  return next;
}

function toUpdate(meta: ModelMeta, data: AnyDoc): AnyDoc {
  const set: AnyDoc = {};
  const inc: AnyDoc = {};
  const push: AnyDoc = {};

  for (const [k, v] of Object.entries(data ?? {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const obj = v as AnyDoc;
      if ('increment' in obj) {
        inc[k] = obj.increment;
        continue;
      }
      if ('push' in obj) {
        push[k] = convertField(meta, k, obj.push);
        continue;
      }
      if ('set' in obj) {
        set[k] = convertField(meta, k, obj.set);
        continue;
      }
      if ('connect' in obj) {
        continue;
      }
    }
    set[k === 'id' && meta.idField === 'id' ? '_id' : k] = convertField(
      meta,
      k,
      v,
    );
  }

  const update: AnyDoc = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(inc).length) update.$inc = inc;
  if (Object.keys(push).length) update.$push = push;
  return update;
}

async function createDelegate(
  model: keyof typeof modelMetaMap,
  db: Db,
  session?: ClientSession,
) {
  const meta = modelMetaMap[model];
  const col = db.collection(meta.collection);
  const delegate: Record<string, any> = {};

  delegate.findMany = async (args: QueryArgs = {}) => {
    const filter = buildFilter(meta, args.where);
    const projection = toProjection(meta, args.select);
    const sort = toSort(args.orderBy);
    let cursor = col.find(
      filter,
      projection ? { projection, session } : { session },
    );
    if (sort) cursor = cursor.sort(sort);
    if (typeof args.skip === 'number') cursor = cursor.skip(args.skip);
    if (typeof args.take === 'number') cursor = cursor.limit(args.take);
    const docs = await cursor.toArray();
    const normalized = docs
      .map((d: AnyDoc) => normalizeDoc(meta, d))
      .filter(Boolean) as AnyDoc[];
    if (!args.include) return normalized;
    return Promise.all(
      normalized.map((doc) => applyInclude(db, meta, doc, args.include)),
    );
  };
  delegate.findFirst = async (args: QueryArgs = {}) => {
    const items = await delegate.findMany({ ...args, take: 1 });
    return items[0] ?? null;
  };
  delegate.findUnique = async (args: QueryArgs = {}) => {
    const filter = buildFilter(meta, args.where);
    const projection = toProjection(meta, args.select);
    const doc = await col.findOne(
      filter,
      projection ? { projection, session } : { session },
    );
    const normalized = normalizeDoc(meta, doc);
    if (!normalized || !args.include) return normalized;
    return applyInclude(db, meta, normalized, args.include);
  };
  delegate.count = async (args: QueryArgs = {}) =>
    col.countDocuments(buildFilter(meta, args.where), { session });
  delegate.create = async (args: QueryArgs = {}) => {
    const data = withMongoId(meta, args.data ?? {});
    const insertData: AnyDoc = {};
    for (const [k, v] of Object.entries(data))
      insertData[k] = convertField(meta, k, v);
    if (meta.idField !== 'id' && !insertData._id && insertData[meta.idField]) {
      insertData._id = insertData[meta.idField];
    }
    const result = await col.insertOne(insertData, { session });
    const created = await col.findOne({ _id: result.insertedId }, { session });
    const normalized = normalizeDoc(meta, created);
    if (!normalized || !args.include) return normalized;
    return applyInclude(db, meta, normalized, args.include);
  };
  delegate.createMany = async (args: QueryArgs = {}) => {
    const items = (args.data as AnyDoc[]) ?? [];
    if (!items.length) return { count: 0 };
    const docs = items
      .map((it) => withMongoId(meta, it))
      .map((it) => {
        const copy: AnyDoc = {};
        for (const [k, v] of Object.entries(it))
          copy[k] = convertField(meta, k, v);
        return copy;
      });
    const result = await col.insertMany(docs, { session });
    return { count: Object.keys(result.insertedIds).length };
  };
  delegate.update = async (args: QueryArgs = {}) => {
    const filter = buildFilter(meta, args.where);
    const existing = await col.findOne(filter, { session });
    if (!existing) throw new Error(`No ${model} found for update`);
    const update = toUpdate(meta, args.data ?? {});
    await col.updateOne({ _id: existing._id }, update, { session });
    const updated = await col.findOne({ _id: existing._id }, { session });
    const normalized = normalizeDoc(meta, updated);
    if (!normalized || !args.include) return normalized;
    return applyInclude(db, meta, normalized, args.include);
  };
  delegate.updateMany = async (args: QueryArgs = {}) => {
    const filter = buildFilter(meta, args.where);
    const update = toUpdate(meta, args.data ?? {});
    const result = await col.updateMany(filter, update, { session });
    return { count: result.modifiedCount };
  };
  delegate.delete = async (args: QueryArgs = {}) => {
    const filter = buildFilter(meta, args.where);
    const existing = await col.findOne(filter, { session });
    if (!existing) throw new Error(`No ${model} found for delete`);
    await col.deleteOne({ _id: existing._id }, { session });
    return normalizeDoc(meta, existing);
  };
  delegate.deleteMany = async (args: QueryArgs = {}) => {
    const result = await col.deleteMany(buildFilter(meta, args.where), {
      session,
    });
    return { count: result.deletedCount };
  };
  delegate.upsert = async (args: {
    where?: AnyDoc;
    create?: AnyDoc;
    update?: AnyDoc;
    include?: AnyDoc;
  }) => {
    const filter = buildFilter(meta, args.where);
    const createData = withMongoId(meta, args.create ?? {});
    const insertData: AnyDoc = {};
    for (const [k, v] of Object.entries(createData)) {
      insertData[k] = convertField(meta, k, v);
    }
    if (meta.idField !== 'id' && !insertData._id && insertData[meta.idField]) {
      insertData._id = insertData[meta.idField];
    }

    const update = toUpdate(meta, args.update ?? {});
    const hasUpdate = Object.keys(update).length > 0;
    const hasCreate = Object.keys(insertData).length > 0;

    if (!hasUpdate && !hasCreate) {
      const found = await col.findOne(filter, { session });
      const normalized = normalizeDoc(meta, found);
      if (!normalized || !args.include) return normalized;
      return applyInclude(db, meta, normalized, args.include);
    }

    const atomicUpdate: AnyDoc = { ...update };
    if (hasCreate) {
      const setPayload = (atomicUpdate.$set as AnyDoc | undefined) ?? {};
      const setOnInsert: AnyDoc = { ...insertData };

      // Mongo forbids updating the same path in $set and $setOnInsert.
      // Keep those keys in $set so existing docs still get updated.
      for (const key of Object.keys(setPayload)) {
        if (key in setOnInsert) {
          delete setOnInsert[key];
        }
      }

      for (const operator of ['$set', '$inc', '$push']) {
        const operatorPayload = atomicUpdate[operator] as AnyDoc | undefined;
        if (operatorPayload && !Object.keys(operatorPayload).length) {
          delete atomicUpdate[operator];
        }
      }

      if (Object.keys(setOnInsert).length) {
        atomicUpdate.$setOnInsert = setOnInsert;
      }
    }

    const result = await col.findOneAndUpdate(filter, atomicUpdate, {
      upsert: true,
      returnDocument: 'after',
      session,
    });
    const normalized = normalizeDoc(meta, result);
    if (!normalized || !args.include) return normalized;
    return applyInclude(db, meta, normalized, args.include);
  };

  return delegate;
}

async function buildDbClient(session?: ClientSession) {
  const db = await getMongoDb();
  const client: Record<string, any> = {};

  for (const model of Object.keys(modelMetaMap) as Array<
    keyof typeof modelMetaMap
  >) {
    client[model] = await createDelegate(model, db, session);
  }

  client.$transaction = async (input: any) => {
    const mongoSession = await mongoose.connection.startSession();
    try {
      if (Array.isArray(input)) {
        return Promise.all(input);
      }
      let result: unknown;
      await mongoSession.withTransaction(async () => {
        const txClient = await buildDbClient(mongoSession);
        result = await input(txClient);
      });
      return result;
    } finally {
      await mongoSession.endSession();
    }
  };

  return client;
}

let clientPromise: Promise<any> | null = null;

export async function getDbClient() {
  if (!clientPromise) {
    clientPromise = buildDbClient();
  }
  return clientPromise;
}

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === '$transaction') {
        return async (input: any) => {
          const client = await getDbClient();
          return client.$transaction(input);
        };
      }
      return new Proxy(
        {},
        {
          get(_mTarget, method) {
            return async (...args: unknown[]) => {
              const client = await getDbClient();
              const delegate = client[prop as string];
              const fn = delegate?.[method as string];
              if (typeof fn !== 'function') {
                throw new Error(
                  `Unsupported db call: ${String(prop)}.${String(method)}`,
                );
              }
              return fn(...args);
            };
          },
        },
      );
    },
  },
) as any;
