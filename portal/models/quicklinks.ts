import { createCrudSchemas, type BaseModel, type DateValue, type JsonObject, type Loose, type Nullable, type OptionalNullable } from './shared/base';
import { type DIRECTORYTYPE, type ROOTTYPE, type USERDIRECTORYTYPE, type USERLINKTYPE } from './shared/enums';

export type ShortLink = Loose<
  BaseModel & {
    slug: string;
    redirectTo: string;
    params?: OptionalNullable<JsonObject>;
  }
>;

export type DirectoryList = Loose<
  BaseModel & {
    title: string;
    logo: Nullable<string>;
    slug: string;
    parentDirId: Nullable<string>;
    timestamp: DateValue;
    position?: number;
    isArchive?: boolean;
    clickCount?: number;
    tabType?: OptionalNullable<ROOTTYPE>;
    type?: OptionalNullable<DIRECTORYTYPE | ROOTTYPE>;
    userDirectory?: UserDirectory[];
  }
>;

export type UserDirectory = Loose<
  BaseModel & {
    userId: string;
    directoryId: string;
    directoryData?: OptionalNullable<DirectoryList>;
    directoryType: USERDIRECTORYTYPE;
    clickCount?: number;
    timestamp: DateValue;
  }
>;

export type Link = Loose<
  BaseModel & {
    title: string;
    description: string;
    logo: Nullable<string>;
    image: Nullable<string>;
    linkType?: Nullable<string>;
    url: string;
    clickCount: number;
    isFavorite?: boolean;
    rootParentDirId?: Nullable<string>;
    author?: OptionalNullable<Record<string, unknown>>;
    userLink?: UserLink[];
    authorId?: Nullable<string>;
    directoryId?: Nullable<string>;
  }
>;

export type UserLink = Loose<
  BaseModel & {
    linkType: USERLINKTYPE;
    linkData?: OptionalNullable<Link>;
    linkId: string;
    userId: string;
    directoryId?: Nullable<string>;
    topUsed?: number;
    isFavorite?: OptionalNullable<boolean>;
  }
>;

export type ClientUtilityLink = Loose<
  BaseModel & {
    clientId: string;
    title: string;
    url: string;
    icon: string;
  }
>;

export const shortLinkSchemas = createCrudSchemas<ShortLink>();
export const directoryListSchemas = createCrudSchemas<DirectoryList>();
export const userDirectorySchemas = createCrudSchemas<UserDirectory>();
export const linkSchemas = createCrudSchemas<Link>();
export const userLinkSchemas = createCrudSchemas<UserLink>();
export const clientUtilityLinkSchemas = createCrudSchemas<ClientUtilityLink>();
