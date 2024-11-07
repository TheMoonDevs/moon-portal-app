const fs = require('fs');
const path = require('path');
const cronParser = require('cron-parser');
const dayjs = require('dayjs');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Load cron configuration
const configPath = path.join(__dirname, 'cron-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Calculate the previous 30-minute interval
const now = dayjs();
const lastInterval = dayjs().subtract(30, 'minute');

async function runCronJobs() {
  for (const job of config.crons) {
    try {
      // Parse the cron schedule of the job
      const interval = cronParser.parseExpression(job.schedule, { currentDate: now.toDate() });
      
      // Get the most recent execution time before or equal to `now`
      const prevExecutionTime = dayjs(interval.prev().toDate());

      console.log(`${new Date()}: Checking job: ${job.name}`);
      // console.log(`Previous Execution Time: ${prevExecutionTime.format()}, Interval Start: ${lastInterval.format()}, Now: ${now.format()}`);

      // Check if the previous execution time is within the last 30-minute interval
      if (prevExecutionTime.isSameOrAfter(lastInterval) && prevExecutionTime.isSameOrBefore(now)) {
        console.log(`${new Date()}: Executing job: "${job.name}" Scheduled at ${prevExecutionTime.format()}`);
        
        // Execute the job by sending a fetch request to its URL
        const response = await fetch(job.url);
        const result = await response.json();
        console.log(`${new Date()}: Job ${job.name} completed successfully:`, result);
      } else {
        console.log(`${new Date()}: Skipping job ${job.name}, not due this interval.`);
      }
    } catch (error) {
      console.error(`${new Date()}: Failed to run job ${job.name}:`, error.message);
    }
  }
}

// Execute the function to run due cron jobs
runCronJobs();
