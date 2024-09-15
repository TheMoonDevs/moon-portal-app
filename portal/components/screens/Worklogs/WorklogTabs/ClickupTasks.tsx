import React from "react";
import { filterTasks, filterTasksByPerson } from "@/utils/clickup/helper";
import { tasks } from "@/utils/dummy/clickup/tasks";
import { useUser } from "@/utils/hooks/useUser";
import { Task } from "@/utils/@types/clickup/types";

const getColour = (status: string) => {
  if (status.toLocaleLowerCase() == "to do") return "bg-[#3C414A] text-white";
  else if (status.toLocaleLowerCase() == "in review")
    return "bg-[#F9BE34] text-black";
  else return "bg-[#8077F1] text-white";
};

const ClickupTask = () => {
  const { user } = useUser();
  const filteredTasks = filterTasks(tasks);
  const myTasks = filterTasksByPerson(user?.email || "", filteredTasks);
  const status = ["to do", "in development", "in review"];
  const separated: any = { "to do": [], "in review": [], "in development": [] };
  myTasks.forEach((task: Task) => {
    separated[task.status].push(task);
  });
  return (
    <div className="p-4 rounded-lg space-y-4 font-sans">
      {status.map((status) => (
        <SingleTask key={status} status={status} tasks={separated[status]} />
      ))}
    </div>
  );
};

const SingleTask = ({ status, tasks }: { status: string; tasks: Task[] }) => {
  const background = getColour(status);

  return (
    <div className="space-y-2">
      <h1 className={"w-fit px-2 py-1 rounded-lg " + background}>
        {status.toUpperCase()}
      </h1>
      <div>
        {tasks.map((task) => (
          <div key={task.taskId} className="flex justify-between">
            <p>{task.name}</p>
            <p>{task.priority} High</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClickupTask;
