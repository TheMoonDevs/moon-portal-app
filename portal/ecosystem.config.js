module.exports = {
    apps: [
        {
            name: "cron-runner",
            script: "./cron/run-crons.js",
            cron_restart: "0,30 * * * *", // Runs at 0 and 30 minutes of every hour
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            autorestart: false
        }
    ]
};
