import React from 'react';

const EmojiLegend = () => {
  return (
    <>
      <p className='text-lg font-bold my-4'>Emoji Legend:</p>
      <ul className='list-disc font-mono text-sm tracking-widest'>
        <li>
          <span className='font-bold'>:check:</span> === ✅ - Task Completed
        </li>
        <li>
          <span className='font-bold'>:cross:</span> === ❌ - Task Failed
        </li>
        <li>
          <span className='font-bold'>:yellow:</span> === 🟡 - Task In Progress
        </li>
        <li>
          <span className='font-bold'>:red:</span> === 🔴 - Task Blocked
        </li>
        <li>
          <span className='font-bold'>:calendar:</span> === 📅 - Scheduled Task
        </li>
        <li>
          <span className='font-bold'>:pencil:</span> === ✏️ - Task Being
          Written
        </li>
        <li>
          <span className='font-bold'>:bulb:</span> === 💡 - New Idea
        </li>
        <li>
          <span className='font-bold'>:question:</span> === ❓ - Need
          Clarification
        </li>
        <li>
          <span className='font-bold'>:star:</span> === ⭐ - High Priority
        </li>
      </ul>
    </>
  );
};

export default EmojiLegend;
