'use client';

import { useParams } from 'next/navigation';
import { FounderPage } from './FounderPage';

export default function TeamPage() {
    const params = useParams();
    const slug = params.slug as string;

    //const profile = 

    if (slug === 'founder') {
        return <FounderPage />;
    }

    return <div>Team</div>;
} 