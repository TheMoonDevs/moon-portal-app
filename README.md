# Intrrnal Apps of TheMoonDevs

Most repos us shared databases, hence when you make a change in prisma, please update it in all places accordingly.

if you have a git pull issue, try this
`git config --global core.compression 9`

## Moon Home - /home

Official website of TheMoonDevs

Deployed on

- Digital Ocean Droplet
- [themoondevs.com](http://themoondevs.com)

## Portal App - /portal

For all internal functionalities accessible to the team & clients.

Deployed on

- Digital Ocean Droplet
- [portal.themoondevs.com](http://portal.themoondevs.com)
- Docs at in /portal folder

## Payzone App - /payzone

For all payment and secure features accessible to the team & clients.
Referral dahboard is also included in this repo.

Deployed on

- Digital Ocean Droplet
- [pay.themoondevs.com](http://portal.themoondevs.com)

## TMD smart contracts - /contract

For all smart contracts of TheMoonDevs, deployed on all chains

### TMDCredit

- Base chain


## CI/CD Setup

### Preview Deployment Flow  
1. **Trigger:** Runs when a PR is opened or updated.  
2. **Concurrency:** Cancels previous runs if a new commit is pushed.  
3. **`determine_project` Job:**  
   - Checks if any file in `portal/` or `payzone/` changed; skips if no changes.  
4. **`build_and_deploy` Job (Runs for Each Project):**  
   - Installs dependencies and assigns a preview port (`8000-8500` for Portal, `8500-9000` for Payzone). 
   - Get the ci env keys for that project using dotenv-vault key stored in github secrets
   - Builds and uploads the files to droplet (`apps/builds/[project-name]/preview/[pr-number]/`) using rsync.
   - Starts the project via SSH and PM2.  
   - Updates the pr labels and comment with status and preview url.
   - Runs post-processing (caching, cleanup).  
  
5. **`cleanup_on_pr_close` Job:**  
   - Stops PM2 processes and deletes preview files when a PR is merged/closed.  
6. **Known Issue:**  
   - If a PR is merged or closed while its deployment is still in progress, the `cleanup_on_pr_close` job will attempt to stop the PM2 process and delete the deployment folder **before** they are created/updated.
   - However, since the deployment is still running, it will **recreate the files and processes after cleanup has already executed**, leaving them undeleted.  
   - Since `cleanup_on_pr_close` only runs once per PR close event, it won’t attempt deletion again, resulting in orphaned files and running processes on the server.  
   - **Workaround:** Wait for the deployment to finish before merging or closing the PR to prevent this issue or we'll have to manually delete the deployment folders by sshing into the droplet.


## Environment Variables
### Portal & Payzone App
- Production and CI envs are managed via [dotenv-vault](https://vault.dotenv.org/ui/ui1/organization/3wFqnV/projects).  
- Development env changes should be shared within the team on Slack.  

### Managing Environment Variables
If you have dotenv-vault access, follow these steps:  

```sh
cd <project-folder>
npx dotenv-vault@latest login
npx dotenv-vault@latest pull
```

Edit `.env.ci` or `.env.prod`, then update:  

```sh
npx dotenv-vault@latest build
npx dotenv-vault@latest push
```

Ensure `.env.vault` is updated, commit the changes, and push to GitHub.  

If you don't have access, contact [Vishwajeet](https://themoondevs.slack.com/archives/D06MRE6B0EN) or [Subhakar](https://themoondevs.slack.com/archives/D06MRB013K5) on Slack to update the keys.

## Cron Setup
Modify `portal/cron/cron-config.json` to add/edit/remove cron jobs.  
  
Trigger Frequency: Crons are checked every 30 minutes for any scheduled tasks.

- ⏳ Minimum cron interval: 30 minutes.

API Usage Guidelines:
- Use the full original URL for external APIs.  
- For internal APIs deployed on the droplet, use:  
  - **Home:** `http://localhost:3000`  
  - **Portal:** `http://localhost:3001`  
  - **Payzone:** `http://localhost:3002`  
