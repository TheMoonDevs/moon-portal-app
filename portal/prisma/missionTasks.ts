
export interface MissionTask{
    userId: string;
    title: string;
    description: string;
    indiePoints: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date;
    expirable:   boolean;
    expiresAt: Date;
    useerInfo: {
        avatar: string;
        name: string;
        email: string;
        id: string;
    }
}