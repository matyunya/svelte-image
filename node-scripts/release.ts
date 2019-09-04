import * as path from "path";
import * as fs from "fs";
import * as inquirer from "inquirer";
import * as runscript from "runscript";
import * as semver from "semver";
import * as git from "simple-git/promise";

//
// Settings
//

const versionTagPrefix = "v";
const useBranchingTags = true;
const releaseFromBranch = "master";
const remoteName = "origin";
const localReleaseDate = false; // true for local date, false for utc
const numNewlinesBetweenReleases = 3;

enum ShellCommands {
  runRegularTests = "yarn test"
}

enum BumpType {
  // edit these to change the text displayed in the console
  patch = "patch: bugix only",
  minor = "minor: feature release",
  major = "major: backwards incompatible changes"
}

const packageFileLocation = path.join(process.cwd(), "package.json");
const changelogLocation = path.join(process.cwd(), "CHANGELOG.md");
const changelogUnreleasedText = "## [Unreleased]";

// END SETTINGS

//
// ARGV flags
//

const DEBUG = process.argv.includes("--debug");
const NO_TAG = process.argv.includes("--no-tag");
const TAG = !NO_TAG;

// End ARGV flags

function errorUnlessDebug(message: string, additionalDebugInfo?: string) {
  if (!DEBUG) {
    throw new Error(message);
  }
  console.log("DEBUG MODE: The following error would have stopped execution:");
  console.error(message);
  if (additionalDebugInfo) {
    console.log("Additional information:");
    console.log(additionalDebugInfo);
  }
}

function debugLog(message: string, ...additionalMessages: string[]) {
  if (DEBUG) console.log(`DEBUG MODE: ${message}`);
  additionalMessages.forEach(console.log);
}

debugLog("Running in DEBUG MODE. Nothing will be pushed to origin.");

if (NO_TAG) {
  errorUnlessDebug("You cannot refrain from tagging unless you are debugging");
}

interface Versions {
  continuingVersion: string;
  currentVersion: string;
  releaseVersion: string;
}

const initialQuestions: inquirer.QuestionCollection = [
  {
    type: "list",
    name: "bumpType",
    message: "What kind of release is this?",
    choices: [BumpType.patch, BumpType.minor, BumpType.major]
  },
  {
    type: "confirm",
    name: "abort",
    when: () => changelogIsInvalid(),
    message:
      "Whoa! Looks like the CHANGELOG.md file doesn't have any notes on this release you are attempting. Would you like to quit so you can note a few changes for this release?",
    default: true
  }
];

async function allowUserToPublish() {
  const {confirmPublish} = await inquirer.prompt([
    {
      type: 'list',
      name: 'waitOnPublish',
      message: "At this point the repo is in a state where you can publish your changes to NPM. This helper script is still running though, so you should open another terminal to run `npm publish`. Once publishing is complete, come back to this terminal and hit return. Alternatively, you could just checkout the commit I've just created for you at a later time and publish to NPM then.",
      choices: ["OK"],
    },
    {
      type: 'list',
      name: 'confirmPublish',
      message: "Were you able to publish to NPM successfully?",
      choices: [{name:"No, I'm still working on it.", value: false, checked: true}, {name:"Yes/I'll do it later.", value: true}]
    }
  ])
  return confirmPublish || allowUserToPublish()
}

async function getAnswersFromUser() {
  const answers = await inquirer.prompt(initialQuestions);
  if (answers.abort) {
    console.log("Aborting so that you can make the changes you need.");
    process.exit();
  }
  const bumpType: BumpType = answers.bumpType;

  return { bumpType };
}

function getPackageJson(): { version: string } {
  return JSON.parse(fs.readFileSync(packageFileLocation, "utf8"));
}

function getVersions(
  bumpTypeAnswer: BumpType | undefined
): Versions | undefined {
  let increment: "patch" | "minor" | "major";
  switch (bumpTypeAnswer) {
    case BumpType.patch:
      increment = "patch";
      break;
    case BumpType.minor:
      increment = "minor";
      break;
    case BumpType.major:
      increment = "major";
      break;
    case undefined:
      return undefined;
    default:
      throw new Error(`Unknown bumpTypeAnswer: ${bumpTypeAnswer}`);
  }

  const currentVersion = getPackageJson().version;
  const releaseVersion = semver.inc(currentVersion, increment);
  if (!releaseVersion)
    throw new Error(
      `either currentVersion or increment were wrong: currentVersion: ${currentVersion}, increment: ${increment}`
    );
  const continuingVersion = semver.inc(releaseVersion, "patch") + "-pre";

  console.log({ currentVersion, releaseVersion, continuingVersion });

  return { currentVersion, releaseVersion, continuingVersion };
}

async function doTests() {
  if (DEBUG) {
    debugLog("Would be testing here.");
  } else {
    try {
      await runscript(ShellCommands.runRegularTests);
      console.log("\n\n");
    } catch (e) {
      console.log(
        `\n\n\n\nDeploy aborted because tests failed. Be sure that you can run \`${ShellCommands.runRegularTests}\` (or \`npm test\` to develop while testing) without failure.\n`
      );
      process.exit();
    }
  }
}

async function checkRepoIsReady() {
  const ON_DESIGNATED_BRANCH = new RegExp(
    `branch ${escapeRegExp(releaseFromBranch)}`
  );
  const IS_CLEAN = /nothing to commit, working [a-z]+ clean/;
  const errors: string[] = [];
  let io: string;
  try {
    io = (
      (await runscript("git status", { stdio: "pipe" })).stdout || ""
    ).toString();
  } catch (_e) {
    throw new Error("Git status check threw an error");
  }

  if (!io) throw new Error("Git status failed. No output");
  debugLog("Here is the git status output:", io);

  if (!ON_DESIGNATED_BRANCH.test(io))
    errors.push(`Not on ${releaseFromBranch} branch.`);

  if (!IS_CLEAN.test(io))
    errors.push(
      "Uncommitted changes exist. Commit or stash your changes before publishing a new release."
    );

  if (errors.length > 0) {
    const allErrors = errors.join(" ");
    if (DEBUG) {
      debugLog(
        "Would have failed and exited here because we have the following errors:",
        allErrors
      );
    } else {
      console.log(`Cannot create new commit. ${allErrors}`);
      process.exit();
    }
  }
}

function bumpPackage(version: string) {
  const json = getPackageJson();
  json.version = version;
  fs.writeFileSync(
    process.cwd() + "/package.json",
    JSON.stringify(json, null, 2)
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function changelogIsInvalid(): boolean {
  const contents: string = fs.readFileSync(changelogLocation, "utf8");
  const regexForInvalid = new RegExp(
    `${escapeRegExp(changelogUnreleasedText)}\\s*## \\[`,
    "g"
  );
  return regexForInvalid.test(contents);
}

function formatDate(date: Date) {
  if (localReleaseDate) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  } else {
    return `${date.getUTCFullYear()}-${date.getUTCMonth() +
      1}-${date.getUTCDate()} UTC`;
  }
}

function getNewlines() {
  return Array.from(new Array(numNewlinesBetweenReleases)).reduce(
    a => a + "\n",
    ""
  );
}

function updateChangelog(version: string, date: Date) {
  const newText = `${changelogUnreleasedText}\n${getNewlines()}## ${version} - ${formatDate(
    date
  )}`;
  const regex = new RegExp(`^${escapeRegExp(changelogUnreleasedText)}`, "gm");
  const contents: string = fs.readFileSync(changelogLocation, "utf8");
  const newContents: string = contents.replace(regex, newText);

  fs.writeFileSync(changelogLocation, newContents);
}

async function doRelease(versions: Versions) {
  const releaseTagName = `${versionTagPrefix}${versions.releaseVersion}`;
  const continuingTagName = `${versionTagPrefix}${versions.continuingVersion}`;
  const date = new Date();
  const currentBranch = (await git().raw([
    "rev-parse",
    "--abbrev-ref",
    "HEAD"
  ])).trim();

  if (currentBranch !== releaseFromBranch) {
    errorUnlessDebug(
      `Not on the ${releaseFromBranch} branch. Aborting release.`
    );
  }

  bumpPackage(versions.releaseVersion);
  updateChangelog(versions.releaseVersion, date);

  await git().commit(`Release ${releaseTagName}`, [
    packageFileLocation,
    changelogLocation
  ]);

  if (TAG) {
    await git().addTag(releaseTagName);
  await allowUserToPublish();
    

    if (useBranchingTags) {
      await git().reset(["--hard", "HEAD~1"]);

      updateChangelog(versions.releaseVersion, date);
      await git().add(changelogLocation);
    }
  } else {
  await allowUserToPublish();
  }

  bumpPackage(versions.continuingVersion);
  await git().add(packageFileLocation);

  await git().commit(`Bump to ${continuingTagName}`);

  if (DEBUG) {
    debugLog(
      `Would be pushing ${releaseFromBranch} and tag to ${remoteName} here.`
    );
  } else {
    console.log(
      `Pushing ${releaseFromBranch} and tag ${releaseTagName} to ${remoteName}.`
    );
    await git().push(remoteName, currentBranch);
    await git().push(remoteName, releaseTagName);
  }
}

(async function runRelease() {
  const { bumpType } = await getAnswersFromUser();
  const versions = getVersions(bumpType);
  if (versions) {
    await checkRepoIsReady();
    await doTests();
    await doRelease(versions);
  }

  console.log("Done! Release complete!");
})();
