import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'stats.json');

const USERNAME = process.env.GH_USERNAME || 'manishchandraraturi';
const GRAPHQL_URL = 'https://api.github.com/graphql';

const USER_QUERY = `
  query UserStats($login: String!, $cursor: String) {
    user(login: $login) {
      login
      name
      bio
      avatarUrl
      followers {
        totalCount
      }
      repositories(
        first: 100
        after: $cursor
        privacy: PUBLIC
        ownerAffiliations: OWNER
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          description
          url
          stargazerCount
          forkCount
          isFork
          pushedAt
          primaryLanguage {
            name
            color
          }
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            totalSize
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
      contributionsCollection {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
              color
              weekday
            }
          }
        }
      }
    }
  }
`;

async function graphqlRequest(token, query, variables) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'manishchandraraturi-profile-scripts',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub GraphQL HTTP ${response.status}: ${text}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    const messages = payload.errors.map((e) => e.message).join('; ');
    throw new Error(`GitHub GraphQL error: ${messages}`);
  }

  return payload.data;
}

function computeCalendarStats(weeks) {
  const days = weeks.flatMap((week) => week.contributionDays);
  let activeDays = 0;
  let busiestDay = { date: null, count: 0 };
  let currentStreak = 0;
  let longestStreak = 0;

  for (const day of days) {
    const count = day.contributionCount || 0;
    if (count > 0) {
      activeDays += 1;
      currentStreak += 1;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }

    if (count > busiestDay.count) {
      busiestDay = { date: day.date, count };
    }
  }

  return {
    days,
    activeDays,
    busiestDay,
    longestStreak,
  };
}

function aggregateLanguages(repos) {
  const totals = new Map();

  for (const repo of repos) {
    for (const lang of repo.languages) {
      const existing = totals.get(lang.name) || {
        name: lang.name,
        color: lang.color,
        size: 0,
      };
      existing.size += lang.size;
      totals.set(lang.name, existing);
    }
  }

  const totalBytes = Array.from(totals.values()).reduce((sum, l) => sum + l.size, 0);

  return Array.from(totals.values())
    .sort((a, b) => b.size - a.size)
    .map((lang) => ({
      ...lang,
      percentage: totalBytes > 0 ? Number(((lang.size / totalBytes) * 100).toFixed(2)) : 0,
    }));
}

async function fetchAllData(token, login) {
  let cursor = null;
  let hasNextPage = true;
  let userMeta = null;
  let contributionsCollection = null;
  let publicRepoCount = 0;
  const rawRepos = [];

  while (hasNextPage) {
    const data = await graphqlRequest(token, USER_QUERY, { login, cursor });
    const user = data?.user;

    if (!user) {
      throw new Error(`GitHub user "${login}" not found.`);
    }

    if (!userMeta) {
      userMeta = {
        login: user.login,
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        followers: user.followers?.totalCount ?? 0,
      };
      contributionsCollection = user.contributionsCollection;
      publicRepoCount = user.repositories?.totalCount ?? 0;
    }

    const repoConn = user.repositories;
    if (repoConn?.nodes?.length) {
      rawRepos.push(...repoConn.nodes);
    }

    hasNextPage = Boolean(repoConn?.pageInfo?.hasNextPage);
    cursor = repoConn?.pageInfo?.endCursor ?? null;
  }

  const repositories = rawRepos.map((repo) => {
    const totalLangSize = repo.languages?.totalSize || 0;
    const languages = (repo.languages?.edges || []).map((edge) => ({
      name: edge.node.name,
      color: edge.node.color,
      size: edge.size,
      percentage:
        totalLangSize > 0 ? Number(((edge.size / totalLangSize) * 100).toFixed(2)) : 0,
    }));

    return {
      name: repo.name,
      description: repo.description,
      url: repo.url,
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      isFork: repo.isFork,
      pushedAt: repo.pushedAt,
      primaryLanguage: repo.primaryLanguage,
      languages,
    };
  });

  const totalStars = repositories.reduce((sum, repo) => sum + (repo.stars || 0), 0);
  const weeks = contributionsCollection?.contributionCalendar?.weeks || [];
  const totalContributions =
    contributionsCollection?.contributionCalendar?.totalContributions ?? 0;
  const calendarStats = computeCalendarStats(weeks);

  return {
    fetchedAt: new Date().toISOString(),
    user: {
      ...userMeta,
      publicRepos: publicRepoCount,
      totalStars,
    },
    languages: aggregateLanguages(repositories),
    repositories,
    contributions: {
      totalContributions,
      totalCommitContributions: contributionsCollection?.totalCommitContributions ?? 0,
      totalIssueContributions: contributionsCollection?.totalIssueContributions ?? 0,
      totalPullRequestContributions:
        contributionsCollection?.totalPullRequestContributions ?? 0,
      totalPullRequestReviewContributions:
        contributionsCollection?.totalPullRequestReviewContributions ?? 0,
      restrictedContributionsCount:
        contributionsCollection?.restrictedContributionsCount ?? 0,
      activeDays: calendarStats.activeDays,
      longestStreak: calendarStats.longestStreak,
      busiestDay: calendarStats.busiestDay,
      weeks,
      days: calendarStats.days,
    },
  };
}

async function main() {
  const token = process.env.GH_TOKEN;
  if (!token) {
    console.error('Error: GH_TOKEN environment variable is required.');
    process.exit(1);
  }

  console.log(`Fetching GitHub stats for ${USERNAME}...`);
  const stats = await fetchAllData(token, USERNAME);

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');

  console.log(
    `Saved ${OUTPUT_PATH} (${stats.user.publicRepos} public repos, ${stats.user.totalStars} stars, ${stats.contributions.totalContributions} contributions)`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
