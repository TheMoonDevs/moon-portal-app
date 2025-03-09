import { ReactNode } from 'react';
import {
  AIEmpoweredDevelopment,
  BuildersNetwork,
  INNOVATORS_DATA,
  ProjectSupport,
  RealtimeProgressTracking,
  Testimonial,
} from './SectionComponents';

export interface IFeature {
  id: string;
  title: string;
  traits: string;
  sectionTitle: string;
  sectionHeading: string;
  sectionDescription: string;
  content: ReactNode;
  titleIconColor: string;
  orientation: 'vertical' | 'horizontal';
}

export const features: IFeature[] = [
  {
    id: 'ai-empowered-development',
    title: 'Ai Empowered Development',
    traits: 'speed',
    sectionTitle: 'Ai Empowered Development',
    sectionHeading: "Speed & Performance beyond what's humanly possible.",
    sectionDescription:
      'Work with teams & devs who know how to take advantage of AI',
    content: <AIEmpoweredDevelopment />,
    titleIconColor: 'bg-orange-500',
    orientation: 'vertical',
  },
  {
    id: 'progress-tracking',
    title: 'Realtime progress tracking',
    traits: 'efficiency',
    sectionTitle: 'Transparent Progress Tracking',
    sectionHeading: 'Top-Notch tools to keep you updated at every step',
    sectionDescription:
      'Our portal platform gives you complete realtime progress updates on team & devs - Quality that can be measured',
    content: <RealtimeProgressTracking />,
    titleIconColor: 'bg-blue-400',
    orientation: 'vertical',
  },
  {
    id: 'industry-experts',
    title: 'Industry experts at demand',
    traits: 'technique',
    sectionTitle: 'elite developers who work with edge-tech',
    sectionHeading: 'Industry experts that you can consult/work with',
    sectionDescription:
      'fractional cto’s & cmo’s available at demand to lead / advice your project',
    content: <Testimonial />,
    titleIconColor: 'bg-yellow-500',
    orientation: 'vertical',
  },
  {
    id: 'long-term-project-support',
    title: 'Long term project support',
    traits: 'help',
    sectionTitle: 'Long term & RESPONSIVE support',
    sectionHeading: 'Teams that care to solve you out of your fix',
    sectionDescription:
      'bug fixes or feature requests - we will never say no when you need us.',
    content: <ProjectSupport />,
    titleIconColor: 'bg-green-500',
    orientation: 'vertical',
  },
  {
    id: 'devs-with-the-same-passion',
    title: 'Devs with the same passion',
    traits: 'passion',
    sectionTitle: 'problem solvers that love challenges',
    sectionHeading: 'Innovators Who Build & Scale',
    sectionDescription:
      'From Idea to Launch: We help startups validate, iterate, and grow with powerful MVPs.',
    content: <Testimonial data={INNOVATORS_DATA} />,
    titleIconColor: 'bg-orange-500',
    orientation: 'vertical',
  },
  {
    id: 'builders-network',
    title: 'Builders Network',
    traits: 'scale',
    sectionTitle: 'ascess to builder network',
    sectionHeading: 'Reach out & network with tech leaders',
    sectionDescription:
      'Our network of builders & devs are some of the best edge-tech innovators / visionaries across the globe',
    content: <BuildersNetwork />,
    titleIconColor: 'bg-purple-500',
    orientation: 'horizontal',
  },
];
