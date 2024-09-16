import React from "react";
import { filterTasksByPerson } from "@/utils/clickup/helper";
import { useUser } from "@/utils/hooks/useUser";
import { CircleIcon, Flag } from "lucide-react";
import Link from "next/link";
import { Task } from "@prisma/client";
import { useTasks } from "@/utils/hooks/useTasks";

const ClickupTask = () => {
  const { user } = useUser();
  const { tasks, loading } = useTasks();
  const myTasks: Task[] = filterTasksByPerson(user?.email as string, tasks);
  const status = ["to do", "in development", "in review"];
  const separated: any = { "to do": [], "in review": [], "in development": [] };
  myTasks.forEach((task: Task) => {
    separated[task.status].push(task);
  });
  return (
    <div className="p-4 rounded-lg space-y-4 font-sans">
      {loading && <p>Loading ...</p>}
      {!loading &&
        status.map((status) => (
          <SingleTask key={status} status={status} tasks={separated[status]} />
        ))}
    </div>
  );
};

const SingleTask = ({ status, tasks }: { status: string; tasks: Task[] }) => {
  const getColour = (status: string) => {
    if (status.toLocaleLowerCase() == "to do") return "bg-[#3C414A] text-white";
    else if (status.toLocaleLowerCase() == "in review")
      return "bg-[#F9BE34] text-black";
    else return "bg-[#8077F1] text-white";
  };
  const background = getColour(status);

  return (
    <div className="space-y-2">
      <h1 className={"w-fit px-2 py-1 rounded-lg flex gap-2 " + background}>
        <CircleIcon />
        <span>{status.toUpperCase()}</span>
      </h1>
      <div>
        {tasks.map((task) => (
          <Link
            href={task.url}
            target="_blank"
            key={task.taskId}
            className="flex justify-between"
          >
            <p>{task.name}</p>
            <p>
              <PriorityDisplay priority={task.priority || ""} />
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

const PriorityDisplay = ({ priority }: { priority: string }) => {
  if (!priority) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-400";
      case "high":
        return "text-yellow-400";
      case "normal":
        return "text-blue-400";
      case "low":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <Flag className={`w-4 h-4 ${getPriorityColor(priority)}`} />
      <span className="text-black">{priority}</span>
    </div>
  );
};

export default ClickupTask;
