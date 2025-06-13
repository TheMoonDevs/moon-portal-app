import TeamPage from "@/components/Pages/Teampage/TeamPage";
import { Metadata } from "next";

type Props = {
    params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {

    if (params.slug === 'founder') {
        return {
            title: `Subhakar Tikkireddy - Founder & CEO | The Moon Devs`,
            description: `Solving tech for global startups, Subhakar is a serial entrepreneur and a fractional CTO offering his consultation for leading startups across the world.`,
        }
    }

    return {
        title: `${params.slug} - Team | Moon Devs`,
        description: `Learn more about ${params.slug} at Moon Devs.`,
    }
}

export default function Page() {
    return <TeamPage />;
}
