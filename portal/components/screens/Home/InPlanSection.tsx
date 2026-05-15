import dayjs from 'dayjs';

import { WorklogView } from '../Worklogs/WorklogView';

export const InPlanSection = ({ visible }: { visible?: boolean }) => {
  return (
    <div>
      <section
        style={{ display: !visible ? 'none' : 'block' }}
        className="relative m-4 mt-6 max-h-[50vh] overflow-hidden rounded-xl border-neutral-400 bg-white px-0 py-2 shadow-md"
      >
        <WorklogView
          date={dayjs().add(1, 'day').format('YYYY-MM-DD')}
          compactView={true}
        />
      </section>
    </div>
  );
};
