import React from "react";

const WorklogTips = () => {
  return (
    <div>
      <p className="text-lg font-bold mb-4">Tasks from clickup</p>
      <ul className=" font-mono text-sm tracking-widest">
        <li className="">Something...</li>
      </ul>
      <p className="text-lg font-bold my-4">Worklog tips</p>
      <ul className="list-decimal font-mono text-sm tracking-widest ml-3">
        <li className="">Use Short Bulletin points</li>
        <li className="">Log every minor update</li>
        <li className="">Add ✅ as you complete each task.</li>
        <li className="">At the end, Note Todo&apos;s for tomorrow</li>
        <li className="">Use summarise to generate logs.</li>
      </ul>
      <p className="text-lg font-bold  my-4">Shortcuts</p>
      <ul className="list-disc font-mono text-sm tracking-widest">
        <li className="">Ctrl+Spacebar === ✅</li>
        <li className="">Ctrl+S to save the logs manually</li>
        <li className="">Ctrl+R to Refresh the logs</li>
        <li className="">Type `-` to add bulletin</li>
        <li className="">Click Tab to add space to bulletin</li>
      </ul>
      <p className="text-lg font-bold my-4">Emoji Legend:</p>
      <ul className="list-disc font-mono text-sm tracking-widest">
        <li>
          <span className="font-bold">:check:</span> === ✅ - Task Completed
        </li>
        <li>
          <span className="font-bold">:cross:</span> === ❌ - Task Failed
        </li>
        <li>
          <span className="font-bold">:yellow:</span> === 🟡 - Task In Progress
        </li>
        <li>
          <span className="font-bold">:red:</span> === 🔴 - Task Blocked
        </li>
        <li>
          <span className="font-bold">:calendar:</span> === 📅 - Scheduled Task
        </li>
        <li>
          <span className="font-bold">:pencil:</span> === ✏️ - Task Being
          Written
        </li>
        <li>
          <span className="font-bold">:bulb:</span> === 💡 - New Idea
        </li>
        <li>
          <span className="font-bold">:question:</span> === ❓ - Need
          Clarification
        </li>
        <li>
          <span className="font-bold">:star:</span> === ⭐ - High Priority
        </li>
      </ul>
    </div>
  );
};

export default WorklogTips;
