import React, { useState, ReactNode, useEffect, useCallback } from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import { DocMarkdown } from '@prisma/client';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { MdxAppEditor } from '@/utils/configure/MdxAppEditor';
import { debounce } from 'lodash';
import { useDebouncedEffect } from '@/utils/hooks/useDebouncedHook';

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      
    >
      {value === index && (
        <Box sx={{ p: 3 }} >
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
};

const SimpleTabs = ({
  userId
}:{
  userId: string;
}) => {
  const [value, setValue] = useState<number>(0);
  const MARKDOWN_PLACHELODER = `*`

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  const [docMarkdown, setDocMarkdown] = useState<DocMarkdown | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>(MARKDOWN_PLACHELODER);
  const [loading, setLoading]=useState<boolean>(false)

  useEffect(() => {
    fetchLaterToDo(userId)
  }, [userId]);

  const fetchLaterToDo = (userId: string) =>{
    setLoading(true)
    PortalSdk.getData(`/api/user/todolater?userId=${userId}`,null).then((data)=>{
      setDocMarkdown(data);
      setMarkdownContent(data.data?.markdown.content || '');
    })
    .catch((err) => {
      console.log(err);
    }).finally(()=>{
      setLoading(false)
    });
  }
 
  const saveMarkdownContent = useCallback((content: string) => {
    PortalSdk.putData(`/api/user/todolater`, {data: {
      userId: userId,
      logType: 'todoLater',
      markdown: { content: content },
    }}).then((response) => {
        console.log('Markdown saved successfully', response);
      })
      .catch((error) => {
        console.error('Error saving markdown', error);
      });
  }, [userId]);


  

  const debouncedSave = useCallback(
    debounce((content: string) => saveMarkdownContent(content), 3000),
    [saveMarkdownContent]
  );

  const handleMarkdownChange = (content: string) => {
    setMarkdownContent(content);
    debouncedSave(content);
  };


  

  return (
    <Box sx={{ width: '100%', height: '100%' }} className="overflow-y-scroll rounded-lg border border-neutral-200">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example" >
          <Tab label="Tasks/Tips" {...a11yProps(0)} />
          <Tab label="Todos for later" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0} >
          <div >
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
                <span className="font-bold">:check:</span> === ✅ - Task
                Completed
              </li>
              <li>
                <span className="font-bold">:cross:</span> === ❌ - Task Failed
              </li>
              <li>
                <span className="font-bold">:yellow:</span> === 🟡 - Task In
                Progress
              </li>
              <li>
                <span className="font-bold">:red:</span> === 🔴 - Task Blocked
              </li>
              <li>
                <span className="font-bold">:calendar:</span> === 📅 - Scheduled
                Task
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
      </TabPanel>
      <TabPanel value={value} index={1}>
        {
          loading === false ?(
            <div  onKeyDown={(e) => {
              if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                console.log("Saving Worklogs");
                saveMarkdownContent(markdownContent)
              }
              if (e.ctrlKey && e.key === "r") {
                e.preventDefault();
                console.log("Refreshing Worklogs");
                fetchLaterToDo(userId)
              }
            }}>
                <MdxAppEditor
                  key={`${userId}`}
                  markdown={markdownContent.length !== 0?(markdownContent):(MARKDOWN_PLACHELODER)}
                  contentEditableClassName="mdx_ce leading-1 imp-p-0 grow w-full h-full"
                  onChange={handleMarkdownChange}
                />
               </div>
          ):(
            <div className="animate-spin rounded-full h-5 w-5 p-2 mt-2 border-t-2 border-b-2 border-neutral-700"></div>
          )
        }
         
      </TabPanel>
    </Box>
  );
};

export default SimpleTabs;