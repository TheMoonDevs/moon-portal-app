const fs = require('fs');
const cronParser = require('cron-parser');
const dayjs = require('dayjs');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Load cron configuration
const config = JSON.parse(fs.readFileSync('cron-config.json', 'utf-8'));

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

      console.log(`Checking job: ${job.name}`);
      // console.log(`Previous Execution Time: ${prevExecutionTime.format()}, Interval Start: ${lastInterval.format()}, Now: ${now.format()}`);

      // Check if the previous execution time is within the last 30-minute interval
      if (prevExecutionTime.isSameOrAfter(lastInterval) && prevExecutionTime.isSameOrBefore(now)) {
        console.log(`Executing job: ${job.name} at ${prevExecutionTime.format()}`);
        
        // Execute the job by sending a fetch request to its URL
        const response = await fetch(job.url);
        const result = await response.json();
        console.log(`Job ${job.name} completed successfully:`, result);
      } else {
        console.log(`Skipping job ${job.name}, not due this interval.`);
      }
    } catch (error) {
      console.error(`Failed to run job ${job.name}:`, error.message);
    }
  }
}

// Execute the function to run due cron jobs
runCronJobs();
