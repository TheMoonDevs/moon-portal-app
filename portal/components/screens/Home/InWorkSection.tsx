import Link from 'next/link';
import { WorklogView } from '../Worklogs/WorklogView';
import dayjs from 'dayjs';
import { APP_ROUTES } from '@/utils/constants/appInfo';

export const InWorkSection = ({ visible }: { visible?: boolean }) => {
  return (
    <div>
      <section
        style={{ display: !visible ? 'none' : 'block' }}
        className="relative m-4 mt-6 h-60 max-h-[50vh] overflow-y-scroll rounded-xl border-neutral-400 bg-white px-0 py-2 shadow-md md:h-[unset] md:overflow-hidden"
      >
        <WorklogView date={dayjs().format('YYYY-MM-DD')} compactView={true} />
        <div className="absolute bottom-0 left-0 right-0 flex h-[30vh] flex-col justify-end bg-gradient-to-b from-transparent to-white">
          <p className="p-2 text-center text-xs font-semibold text-neutral-500"></p>
        </div>
      </section>
    </div>
  );
};
