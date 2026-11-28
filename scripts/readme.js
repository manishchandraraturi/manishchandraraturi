import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT_DIR, 'data', 'stats.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'README.md');

function formatNumber(num) {
  return Number(num || 0).toLocaleString('en-US');
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function renderReadme(stats) {
  const user = stats?.user || {};
  const contributions = stats?.contributions || {};

  const publicRepos = user.publicRepos ?? stats?.repositories?.length ?? 0;
  const followers = user.followers ?? 0;
  const totalContributions = contributions.totalContributions ?? 0;
  const longestStreak = contributions.longestStreak ?? 0;

  const galaxySummary = `${pluralize(publicRepos, 'public repository', 'public repositories')}, ${pluralize(totalContributions, 'contribution')} in the last year, a longest streak of ${pluralize(longestStreak, 'day')} and ${pluralize(followers, 'follower')}.`;

  return `<p align="center">
  <img src="./assets/hero.svg" alt="Manish Chandra Raturi — AI / ML Engineer in the making" width="100%" />
</p>

<p align="center">
  <img src="./assets/divider.svg" alt="" width="100%" />
</p>

<p align="center">
  <img src="./assets/h-about.svg" alt="01 About Me" width="100%" />
</p>

<p align="center">
  <img src="./assets/about.svg" alt="About Manish Chandra Raturi" width="100%" />
</p>

<p align="center">
  <img src="./assets/divider.svg" alt="" width="100%" />
</p>

<p align="center">
  <img src="./assets/h-city.svg" alt="02 Contribution City" width="100%" />
</p>

<p align="center">
  <img src="./assets/city.svg" alt="Contribution City showing daily GitHub contributions over the last year" width="100%" />
</p>

<p align="center"><em>Every building is a day; taller buildings mean more contributions.</em></p>

<p align="center">
  <img src="./assets/divider.svg" alt="" width="100%" />
</p>

<p align="center">
  <img src="./assets/h-galaxy.svg" alt="03 Repo Galaxy" width="100%" />
</p>

<p align="center">
  <img src="./assets/galaxy.svg" alt="Repo Galaxy spiral visualization of repositories by language" width="100%" />
</p>

<p align="center">${galaxySummary}</p>

<p align="center">
  <img src="./assets/divider.svg" alt="" width="100%" />
</p>

<p align="center">
  <img src="./assets/h-stack.svg" alt="04 Tech Stack" width="100%" />
</p>

<p align="center">
  <img src="./assets/stack.svg" alt="Tech Stack and AI/ML tools" width="100%" />
</p>

<p align="center">
  <img src="./assets/divider.svg" alt="" width="100%" />
</p>

<p align="center">
  <img src="./assets/h-solar.svg" alt="05 Solar System" width="100%" />
</p>

<p align="center">
  <img src="./assets/solar.svg" alt="Solar System visualization of top languages, repositories, and recent pushes" width="100%" />
</p>

<p align="center"><em>Top languages orbit as planets, repositories orbit as moons, and recent pushes streak across as comets.</em></p>

<p align="center">
  <img src="./assets/divider.svg" alt="" width="100%" />
</p>

<p align="center">
  <img src="./assets/h-connect.svg" alt="06 Connect" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/manishchandraraturi"><img src="./assets/btn-github.svg" alt="GitHub" width="260" /></a>
  &nbsp;&nbsp;
  <a href="https://www.linkedin.com/in/manish-raturi-9bb028388/"><img src="./assets/btn-linkedin.svg" alt="LinkedIn" width="260" /></a>
</p>

<p align="center">
  <img src="./assets/footer.svg" alt="Thanks for stopping by" width="100%" />
</p>
`;
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, 'utf8');
  const stats = JSON.parse(raw);
  const readme = renderReadme(stats);

  await fs.writeFile(OUTPUT_PATH, readme, 'utf8');
  console.log(`Generated ${OUTPUT_PATH}`);
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
