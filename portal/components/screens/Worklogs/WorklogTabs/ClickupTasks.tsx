import React from "react";
import { filterTasksByPerson } from "@/utils/clickup/helper";
import { useUser } from "@/utils/hooks/useUser";
import { CircleIcon, Flag, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Task } from "@prisma/client";
import { useTasks } from "@/utils/hooks/useTasks";

const ClickupTask = ({ email }: { email: string }) => {
  const { tasks, loading } = useTasks();
  const myTasks: Task[] = filterTasksByPerson(email, tasks);
  const statuses = ["to do", "in development", "in review"];
  const separated: any = { "to do": [], "in review": [], "in development": [] };
  myTasks.forEach((task: Task) => {
    separated[task.status].push(task);
  });

  return (
    <div className="p-4 space-y-6 font-sans">
      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      {!loading &&
        statuses.map((status) => {
          if (!separated[status].length) return;
          return (
            <SingleTask
              key={status}
              status={status}
              tasks={separated[status]}
            />
          );
        })}
    </div>
  );
};

const SingleTask = ({ status, tasks }: { status: string; tasks: Task[] }) => {
  const getColour = (status: string) => {
    if (status.toLowerCase() === "to do") return "bg-[#3C414A] text-white";
    else if (status.toLowerCase() === "in review")
      return "bg-[#F9BE34] text-black";
    else return "bg-[#8077F1] text-white";
  };
  const background = getColour(status);
  return (
    <div className="space-y-3">
      <h1
        className={`w-fit px-3 py-1.5 rounded-lg flex items-center gap-2 ${background} shadow-sm`}
      >
        <CircleIcon size={16} />
        <span className="font-semibold">{status.toUpperCase()}</span>
      </h1>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.taskId} task={task} status={status} />
        ))}
      </div>
    </div>
  );
};

const TaskCard = ({ task, status }: { task: Task; status: string }) => {
  const getHoverColor = (status: string) => {
    if (status.toLowerCase() === "to do")
      return "hover:bg-gray-100 hover:border-gray-400";
    else if (status.toLowerCase() === "in review")
      return "hover:bg-yellow-50 hover:border-yellow-400";
    else return "hover:bg-indigo-50 hover:border-indigo-400";
  };
  const hoverBackground = getHoverColor(status);

  return (
    <Link href={task.url} target="_blank" className="block">
      <div
        className={`flex justify-between items-center rounded-lg px-4 py-3 border border-gray-200 ${hoverBackground} transition-all duration-200 ease-in-out`}
      >
        <div className="flex items-center space-x-3">
          <p className="font-medium text-gray-800">{task.name}</p>
          <PriorityDisplay priority={task.priority || ""} />
        </div>
        <ChevronRight className="text-gray-400" size={20} />
      </div>
    </Link>
  );
};

const PriorityDisplay = ({ priority }: { priority: string }) => {
  if (!priority) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "bg-red-50 text-red-700 border-red-100";
      case "high":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "normal":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "low":
        return "bg-gray-50 text-gray-700 border-gray-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  return (
    <div
      className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
        priority
      )} border`}
    >
      <Flag className="w-3 h-3 mr-1" />
      <span>{priority}</span>
    </div>
  );
};

export default ClickupTask;
