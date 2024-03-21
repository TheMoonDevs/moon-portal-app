const tempData = {
  id: "idsdjneslnfrnleskdnelrnv",
  title: "March 24 - Sunday",
  date: "2021-03-24",
  createdAt: "2021-03-24T12:00:00.000Z",
  updatedAt: "2021-03-24T12:00:00.000Z",
  works: [
    {
      id: "sdjnvkrbd-2021-03-24", // should be random id - `random_uid+date`
      text: "Worked on the Moon PWA",
      status: "none", // none, done, inProgress
    },
    {
      id: "djncsjnk-2021-03-24", // should be random id - `random_uid+date`
      text: "Worked on the Moon Homepage",
      status: "done", // none, done, inProgress
    },
    {
      id: "sdvnsjknc-2021-03-24", // should be random id - `random_uid+date`
      text: "Worked on the Moon PWA",
      status: "none", // none, done, inProgress
    },
  ],
};
export const WorklogView = () => {
  return (
    <div className="flex flex-col">
      <div id="header" className="flex flex-row justify-between">
        <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
          <span className="icon_size material-icons">arrow_back</span>
        </div>
        <div className="flex flex-row gap-1">
          <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
            <span className="icon_size material-icons">refresh</span>
          </div>
          <div className="cursor-pointer rounded-lg p-2 text-neutral-900 hover:text-neutral-700">
            <span className="icon_size material-icons">add_circle_outline</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h1 className="text-2xl">{tempData.title}</h1>
        <p className="text-xs">{tempData.date}</p>
        <div className="h-[3em]"></div>
        {tempData.works.map((work) => (
          <div
            key={work.id}
            className="flex flex-row items-center justify-between p-1"
          >
            <span className="text-sm">{work.text}</span>
            {work.status == "done" && (
              <span className="icon_size material-icons text-green-500">
                task_alt
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        id="bottom-bar"
        className="fixed bottom-0 left-0 right-0 mx-1 my-1 flex flex-row gap-3"
      >
        <div
          id="input-bar"
          className="flex flex-row items-center flex-grow justify-between bg-white p-2 rounded-lg shadow-md"
        >
          <span className="icon_size material-icons px-2 ">
            radio_button_unchecked
          </span>
          <input
            type="text"
            className="text-sm flex-grow border-0 rounded-lg text-neutral-900 outline-none"
            placeholder="Jotdown something..."
          />
        </div>
        <div id="buttons" className="flex flex-row justify-between">
          <div className="cursor-pointer rounded-lg p-2 text-neutral-900  bg-white shadow-md">
            <span className="icon_size material-icons">arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  );
};
