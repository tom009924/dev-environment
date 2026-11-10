#!/usr/bin/env node

/**
 * Bitbucket Cloud REST API v2 Helper CLI
 * Zero-dependency CLI using Node.js native fetch.
 */

const { execSync } = require('child_process');

const API_BASE = 'https://api.bitbucket.org/2.0';

// ---------------------------------------------------------
// Helper: Parse Git Remote for workspace, repo, and auth token
// ---------------------------------------------------------
function getGitRemoteInfo() {
  try {
    const raw = execSync('git config --get remote.origin.url', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (!raw) return {};

    // 1. https://x-token-auth:<TOKEN>@bitbucket.org/<workspace>/<repo>(.git)
    let match = raw.match(/https:\/\/x-token-auth:([^@]+)@bitbucket\.org\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      return { token: match[1], workspace: match[2], repo: match[3] };
    }

    // 2. https://<username>:<password>@bitbucket.org/<workspace>/<repo>(.git)
    match = raw.match(/https:\/\/([^:]+):([^@]+)@bitbucket\.org\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      return { username: match[1], password: match[2], workspace: match[3], repo: match[4] };
    }

    // 3. git@bitbucket.org:<workspace>/<repo>(.git) or https://bitbucket.org/<workspace>/<repo>(.git)
    match = raw.match(/(?:git@bitbucket\.org:|https:\/\/bitbucket\.org\/)([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      return { workspace: match[1], repo: match[2] };
    }
  } catch {
    // Not in a git repo or no remote
  }
  return {};
}

// ---------------------------------------------------------
// Helper: Resolve Configuration
// ---------------------------------------------------------
function resolveConfig(args) {
  const remoteInfo = getGitRemoteInfo();

  const token = args.token || process.env.BITBUCKET_TOKEN || process.env.BITBUCKET_ACCESS_TOKEN || remoteInfo.token;
  const username = args.user || args.username || process.env.BITBUCKET_USERNAME || remoteInfo.username;
  const password = args.password || args.appPassword || process.env.BITBUCKET_APP_PASSWORD || remoteInfo.password;

  const workspace = args.workspace || args.ws || process.env.BITBUCKET_WORKSPACE || remoteInfo.workspace;
  const repo = args.repo || process.env.BITBUCKET_REPO || remoteInfo.repo;

  let authHeader = null;
  if (token) {
    authHeader = `Bearer ${token}`;
  } else if (username && password) {
    const creds = Buffer.from(`${username}:${password}`).toString('base64');
    authHeader = `Basic ${creds}`;
  }

  return { authHeader, workspace, repo };
}

// ---------------------------------------------------------
// Helper: API Request
// ---------------------------------------------------------
async function apiRequest(path, { method = 'GET', body = null, authHeader, rawText = false } = {}) {
  if (!authHeader) {
    console.error('Error: No authentication credentials found.');
    console.error('Please provide BITBUCKET_TOKEN or BITBUCKET_USERNAME & BITBUCKET_APP_PASSWORD,');
    console.error('or run within a repo whose git remote contains credentials.');
    process.exit(1);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = {
    'Authorization': authHeader,
    'Accept': 'application/json',
  };

  if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const resp = await fetch(url, {
    method,
    headers,
    body: body || undefined,
  });

  if (rawText) {
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`API Error ${resp.status} ${resp.statusText}: ${err}`);
    }
    return await resp.text();
  }

  if (resp.status === 204) {
    return { success: true, status: 204 };
  }

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data.error ? data.error.message : JSON.stringify(data);
    throw new Error(`API Error ${resp.status} ${resp.statusText}: ${msg}`);
  }
  return data;
}

// ---------------------------------------------------------
// CLI Argument Parser (Minimal flags extractor)
// ---------------------------------------------------------
function parseArgs(argv) {
  const flags = {};
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        flags[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        flags[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

// ---------------------------------------------------------
// Command Handlers
// ---------------------------------------------------------
async function handleRepo(subcmd, flags, config) {
  const { workspace, repo, authHeader } = config;
  if (!workspace || !repo) {
    console.error('Error: Workspace and repo are required (--workspace <ws> --repo <repo> or inside git repo)');
    process.exit(1);
  }

  if (subcmd === 'info' || !subcmd) {
    const data = await apiRequest(`/repositories/${workspace}/${repo}`, { authHeader });
    if (flags.json) return console.log(JSON.stringify(data, null, 2));

    console.log(`Repository:   ${data.full_name}`);
    console.log(`Description:  ${data.description || '(none)'}`);
    console.log(`Private:      ${data.is_private}`);
    console.log(`Main Branch:  ${data.mainbranch ? data.mainbranch.name : '(unknown)'}`);
    console.log(`Updated At:   ${data.updated_on}`);
    console.log(`HTML URL:     ${data.links?.html?.href}`);
  } else {
    console.error(`Unknown repo command: ${subcmd}`);
    process.exit(1);
  }
}

async function handleBranch(subcmd, positional, flags, config) {
  const { workspace, repo, authHeader } = config;
  if (!workspace || !repo) {
    console.error('Error: Workspace and repo are required');
    process.exit(1);
  }

  if (subcmd === 'list' || !subcmd) {
    const data = await apiRequest(`/repositories/${workspace}/${repo}/refs/branches?pagelen=50`, { authHeader });
    if (flags.json) return console.log(JSON.stringify(data, null, 2));

    console.log(`Branches in ${workspace}/${repo}:`);
    for (const b of data.values || []) {
      const hash = b.target?.hash?.slice(0, 8) || '';
      const date = b.target?.date ? new Date(b.target.date).toLocaleString() : '';
      console.log(`* ${b.name.padEnd(35)} ${hash} (${date})`);
    }
  } else if (subcmd === 'create') {
    const branchName = positional[0] || flags.name;
    const target = positional[1] || flags.target || 'main';
    if (!branchName) {
      console.error('Usage: bb.js branch create <branch-name> [target-commit-or-branch]');
      process.exit(1);
    }
    const payload = {
      name: branchName,
      target: { hash: target }
    };
    const data = await apiRequest(`/repositories/${workspace}/${repo}/refs/branches`, {
      method: 'POST',
      body: payload,
      authHeader
    });
    console.log(`Successfully created branch '${data.name}' from '${target}'`);
  } else {
    console.error(`Unknown branch command: ${subcmd}`);
    process.exit(1);
  }
}

async function handlePR(subcmd, positional, flags, config) {
  const { workspace, repo, authHeader } = config;
  if (!workspace || !repo) {
    console.error('Error: Workspace and repo are required');
    process.exit(1);
  }

  if (subcmd === 'list' || !subcmd) {
    const state = flags.state || 'OPEN';
    const data = await apiRequest(`/repositories/${workspace}/${repo}/pullrequests?state=${state}&pagelen=30`, { authHeader });
    if (flags.json) return console.log(JSON.stringify(data, null, 2));

    const prs = data.values || [];
    if (prs.length === 0) {
      console.log(`No ${state} pull requests found for ${workspace}/${repo}.`);
      return;
    }
    console.log(`Pull Requests (${state}) in ${workspace}/${repo}:`);
    for (const pr of prs) {
      const id = `#${pr.id}`.padEnd(6);
      const author = (pr.author?.display_name || pr.author?.nickname || 'unknown').slice(0, 15).padEnd(16);
      const branch = `${pr.source?.branch?.name} -> ${pr.destination?.branch?.name}`;
      console.log(`${id} [${author}] ${pr.title}`);
      console.log(`       (${branch}) ${pr.links?.html?.href}`);
    }
  } else if (subcmd === 'get') {
    const id = positional[0] || flags.id;
    if (!id) {
      console.error('Usage: bb.js pr get <pr-id>');
      process.exit(1);
    }
    const data = await apiRequest(`/repositories/${workspace}/${repo}/pullrequests/${id}`, { authHeader });
    if (flags.json) return console.log(JSON.stringify(data, null, 2));

    console.log(`PR #${data.id}: ${data.title}`);
    console.log(`State:        ${data.state}`);
    console.log(`Author:       ${data.author?.display_name} (@${data.author?.nickname})`);
    console.log(`Branches:     ${data.source?.branch?.name} -> ${data.destination?.branch?.name}`);
    console.log(`URL:          ${data.links?.html?.href}`);
    console.log(`Created:      ${data.created_on}`);
    console.log(`Updated:      ${data.updated_on}`);
    console.log(`\nDescription:\n${data.description || '(none)'}`);
    if (data.participants && data.participants.length > 0) {
      console.log('\nParticipants / Reviewers:');
      for (const p of data.participants) {
        console.log(`- ${p.user?.display_name}: approved=${p.approved}, role=${p.role}`);
      }
    }
  } else if (subcmd === 'diff') {
    const id = positional[0] || flags.id;
    if (!id) {
      console.error('Usage: bb.js pr diff <pr-id>');
      process.exit(1);
    }
    const diffText = await apiRequest(`/repositories/${workspace}/${repo}/pullrequests/${id}/diff`, { authHeader, rawText: true });
    console.log(diffText);
  } else if (subcmd === 'create') {
    const title = flags.title || positional[0];
    const source = flags.source || flags.from;
    const dest = flags.dest || flags.target || flags.to || 'main';
    const description = flags.description || flags.desc || '';
    const closeSource = flags['close-source'] === true || flags.closeSource === true;

    if (!title || !source) {
      console.error('Usage: bb.js pr create --title "<title>" --source "<branch>" [--dest main] [--desc "<desc>"] [--close-source]');
      process.exit(1);
    }

    const payload = {
      title,
      description,
      close_source_branch: closeSource,
      source: { branch: { name: source } },
      destination: { branch: { name: dest } }
    };

    const data = await apiRequest(`/repositories/${workspace}/${repo}/pullrequests`, {
      method: 'POST',
      body: payload,
      authHeader
    });
    console.log(`Successfully created PR #${data.id}: ${data.title}`);
    console.log(`URL: ${data.links?.html?.href}`);
  } else if (subcmd === 'merge') {
    const id = positional[0] || flags.id;
    if (!id) {
      console.error('Usage: bb.js pr merge <pr-id> [--message "<commit-msg>"] [--close-source]');
      process.exit(1);
    }
    const payload = {};
    if (flags.message) payload.message = flags.message;
    if (flags['close-source']) payload.close_source_branch = true;

    const data = await apiRequest(`/repositories/${workspace}/${repo}/pullrequests/${id}/merge`, {
      method: 'POST',
      body: payload,
      authHeader
    });
    console.log(`Successfully merged PR #${id}. State: ${data.state}`);
  } else if (subcmd === 'decline') {
    const id = positional[0] || flags.id;
    if (!id) {
      console.error('Usage: bb.js pr decline <pr-id>');
      process.exit(1);
    }
    const data = await apiRequest(`/repositories/${workspace}/${repo}/pullrequests/${id}/decline`, {
      method: 'POST',
      authHeader
    });
    console.log(`PR #${id} has been declined. State: ${data.state}`);
  } else if (subcmd === 'approve') {
    const id = positional[0] || flags.id;
    if (!id) {
      console.error('Usage: bb.js pr approve <pr-id>');
      process.exit(1);
    }
    const data = await apiRequest(`/repositories/${workspace}/${repo}/pullrequests/${id}/approve`, {
      method: 'POST',
      authHeader
    });
    console.log(`Approved PR #${id}.`);
  } else if (subcmd === 'comments') {
    const id = positional[0] || flags.id;
    if (!id) {
      console.error('Usage: bb.js pr comments <pr-id>');
      process.exit(1);
    }
    const data = await apiRequest(`/repositories/${workspace}/${repo}/pullrequests/${id}/comments`, { authHeader });
    if (flags.json) return console.log(JSON.stringify(data, null, 2));

    const comments = data.values || [];
    console.log(`Comments on PR #${id} (${comments.length}):`);
    for (const c of comments) {
      const user = c.user?.display_name || 'unknown';
      const date = new Date(c.created_on).toLocaleString();
      console.log(`\n[${user} at ${date} (Comment #${c.id})]`);
      if (c.inline) {
        console.log(`File: ${c.inline.path}:${c.inline.to || c.inline.from}`);
      }
      console.log(c.content?.raw || '');
    }
  } else if (subcmd === 'comment') {
    const id = positional[0] || flags.id;
    const message = flags.message || flags.msg || flags.text || positional[1];
    if (!id || !message) {
      console.error('Usage: bb.js pr comment <pr-id> --message "<text>"');
      process.exit(1);
    }
    const payload = {
      content: { raw: message }
    };
    const data = await apiRequest(`/repositories/${workspace}/${repo}/pullrequests/${id}/comments`, {
      method: 'POST',
      body: payload,
      authHeader
    });
    console.log(`Successfully added comment #${data.id} to PR #${id}`);
  } else {
    console.error(`Unknown pr command: ${subcmd}`);
    process.exit(1);
  }
}

async function handlePipeline(subcmd, positional, flags, config) {
  const { workspace, repo, authHeader } = config;
  if (!workspace || !repo) {
    console.error('Error: Workspace and repo are required');
    process.exit(1);
  }

  if (subcmd === 'list' || !subcmd) {
    const data = await apiRequest(`/repositories/${workspace}/${repo}/pipelines/?pagelen=20&sort=-created_on`, { authHeader });
    if (flags.json) return console.log(JSON.stringify(data, null, 2));

    const list = data.values || [];
    if (list.length === 0) {
      console.log(`No pipelines found for ${workspace}/${repo}.`);
      return;
    }
    console.log(`Pipelines in ${workspace}/${repo}:`);
    for (const p of list) {
      const num = `#${p.build_number || '?'}`.padEnd(6);
      const state = p.state?.result?.name || p.state?.name || 'UNKNOWN';
      const target = p.target?.ref_name || p.target?.commit?.hash?.slice(0, 8) || 'unknown';
      const duration = p.duration_in_seconds ? `${p.duration_in_seconds}s` : '';
      console.log(`${num} [${state.padEnd(10)}] on ${target.padEnd(20)} (${duration}) UUID: ${p.uuid}`);
    }
  } else if (subcmd === 'get') {
    const uuid = positional[0] || flags.uuid;
    if (!uuid) {
      console.error('Usage: bb.js pipeline get <pipeline-uuid>');
      process.exit(1);
    }
    const data = await apiRequest(`/repositories/${workspace}/${repo}/pipelines/${uuid}`, { authHeader });
    if (flags.json) return console.log(JSON.stringify(data, null, 2));

    console.log(`Pipeline #${data.build_number} (${data.uuid})`);
    console.log(`State:     ${data.state?.name} (Result: ${data.state?.result?.name || 'in progress'})`);
    console.log(`Target:    ${data.target?.ref_name || data.target?.commit?.hash}`);
    console.log(`Creator:   ${data.creator?.display_name}`);
    console.log(`Duration:  ${data.duration_in_seconds}s`);
    console.log(`Created:   ${data.created_on}`);
    console.log(`Completed: ${data.completed_on || 'N/A'}`);
  } else if (subcmd === 'trigger') {
    const branch = flags.branch || positional[0] || 'main';
    const payload = {
      target: {
        ref_type: 'branch',
        type: 'pipeline_ref_target',
        ref_name: branch
      }
    };
    const data = await apiRequest(`/repositories/${workspace}/${repo}/pipelines/`, {
      method: 'POST',
      body: payload,
      authHeader
    });
    console.log(`Pipeline #${data.build_number} triggered for branch '${branch}'! UUID: ${data.uuid}`);
  } else {
    console.error(`Unknown pipeline command: ${subcmd}`);
    process.exit(1);
  }
}

async function handleCommit(subcmd, positional, flags, config) {
  const { workspace, repo, authHeader } = config;
  if (!workspace || !repo) {
    console.error('Error: Workspace and repo are required');
    process.exit(1);
  }

  if (subcmd === 'list' || !subcmd) {
    const branch = flags.branch || positional[0] || '';
    const query = branch ? `?include=${encodeURIComponent(branch)}` : '?pagelen=15';
    const data = await apiRequest(`/repositories/${workspace}/${repo}/commits${query}`, { authHeader });
    if (flags.json) return console.log(JSON.stringify(data, null, 2));

    console.log(`Recent commits in ${workspace}/${repo}:`);
    for (const c of (data.values || []).slice(0, 15)) {
      const hash = c.hash.slice(0, 8);
      const author = (c.author?.user?.display_name || c.author?.raw || '').slice(0, 18).padEnd(20);
      const msg = (c.message || '').split('\n')[0].slice(0, 50);
      console.log(`${hash} ${author} ${msg}`);
    }
  } else if (subcmd === 'statuses' || subcmd === 'status') {
    const commit = positional[0] || flags.commit;
    if (!commit) {
      console.error('Usage: bb.js commit statuses <commit-hash>');
      process.exit(1);
    }
    const data = await apiRequest(`/repositories/${workspace}/${repo}/commit/${commit}/statuses`, { authHeader });
    if (flags.json) return console.log(JSON.stringify(data, null, 2));

    const list = data.values || [];
    console.log(`Statuses for commit ${commit.slice(0, 8)} (${list.length}):`);
    for (const s of list) {
      console.log(`- [${s.state}] ${s.name} (${s.key}): ${s.url}`);
    }
  } else {
    console.error(`Unknown commit command: ${subcmd}`);
    process.exit(1);
  }
}

async function handleRawApi(positional, flags, config) {
  const method = positional[0] ? positional[0].toUpperCase() : 'GET';
  let path = positional[1];
  const jsonBodyStr = positional[2] || flags.data;

  if (!path) {
    console.error('Usage: bb.js api <METHOD> <PATH> [JSON_BODY]');
    console.error('Example: bb.js api GET /user');
    process.exit(1);
  }

  // Replace {workspace} and {repo} templates if present
  path = path.replace('{workspace}', config.workspace || '').replace('{repo}', config.repo || '');

  let body = null;
  if (jsonBodyStr) {
    try {
      body = JSON.parse(jsonBodyStr);
    } catch {
      body = jsonBodyStr;
    }
  }

  const data = await apiRequest(path, {
    method,
    body,
    authHeader: config.authHeader
  });
  console.log(JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------
// Main
// ---------------------------------------------------------
function printHelp() {
  console.log(`
Bitbucket Cloud REST API CLI Helper

Usage:
  node bb.js <command> [subcommand] [arguments] [options]

Commands:
  repo info                     Show current repository details
  branch list                   List branches in repository
  branch create <name> [target] Create a new branch
  pr list                       List pull requests (--state OPEN|MERGED|DECLINED)
  pr get <id>                   Get details of a pull request
  pr diff <id>                  Get diff text of a pull request
  pr create                     Create PR (--title "..." --source "..." [--dest main] [--desc "..."] [--close-source])
  pr merge <id>                 Merge PR ([--message "..."] [--close-source])
  pr decline <id>               Decline PR
  pr approve <id>               Approve PR
  pr comments <id>              List comments on PR
  pr comment <id> --message "m" Post comment to PR
  pipeline list                 List recent pipeline builds
  pipeline get <uuid>           Get pipeline details
  pipeline trigger [branch]     Trigger a pipeline run
  commit list [branch]          List recent commits
  commit statuses <hash>        Get commit build statuses
  api <METHOD> <PATH> [JSON]    Execute arbitrary Bitbucket API request

Global Options:
  --token <token>               Bearer token / Repository access token
  --user <u> --password <p>     App password credentials
  --workspace <ws>, -w <ws>     Bitbucket workspace (default: auto-detected from git)
  --repo <repo>, -r <repo>      Bitbucket repo slug (default: auto-detected from git)
  --json                        Output raw JSON response
  --help, -h                    Show this help message

Environment Variables:
  BITBUCKET_TOKEN               Bearer token or repo access token
  BITBUCKET_USERNAME            Bitbucket Atlassian username / email
  BITBUCKET_APP_PASSWORD        Bitbucket App Password
  BITBUCKET_WORKSPACE           Default workspace slug
  BITBUCKET_REPO                Default repo slug
`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }

  const { flags, positional } = parseArgs(argv);
  const command = positional[0];
  const subcmd = positional[1];
  const subArgs = positional.slice(2);

  const config = resolveConfig(flags);

  try {
    switch (command) {
      case 'repo':
        await handleRepo(subcmd, flags, config);
        break;
      case 'branch':
        await handleBranch(subcmd, subArgs, flags, config);
        break;
      case 'pr':
        await handlePR(subcmd, subArgs, flags, config);
        break;
      case 'pipeline':
        await handlePipeline(subcmd, subArgs, flags, config);
        break;
      case 'commit':
        await handleCommit(subcmd, subArgs, flags, config);
        break;
      case 'api':
        await handleRawApi(positional.slice(1), flags, config);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(`\x1b[31m${err.message}\x1b[0m`);
    process.exit(1);
  }
}

main();
