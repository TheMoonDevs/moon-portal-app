
export interface MissionTask{
    userId?: string;
    title: string;
    description: string;
    indiePoints: number;
    createdAt?: Date;
    updatedAt?: Date;
    completedAt?: Date;
    completed?: boolean;
    expirable?:   boolean;
    expiresAt?: Date;
    userInfo?: {
        avatar: string;
        name: string;
        email: string;
        id: string;
    }
}