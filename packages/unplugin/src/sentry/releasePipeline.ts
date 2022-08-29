// Build a facade that exposes necessary sentry functionality
// Idea: We start out with Sentry-CLI and replace the cli-commands one by one afterwards.
// Goal: eventually replace everything sentry-cli does with "native" code here
// Reason: We don't want to depend on a binary that gets downloaded in a postinstall hook
//           - no fixed version
//           - huge download
//           - unnecessary functionality

import { Options, BuildContext } from "../types";
import { createRelease, deleteAllReleaseArtifacts, uploadReleaseFile, updateRelease } from "./api";
import { getFiles } from "./sourcemaps";
import { addSpanToTransaction } from "./telemetry";

export async function createNewRelease(
  release: string,
  options: Options,
  ctx: BuildContext
): Promise<string> {
  const span = addSpanToTransaction(ctx, "create-new-release");

  // TODO: pull these checks out of here and simplify them
  if (options.authToken === undefined) {
    ctx.logger.warn('Missing "authToken" option. Will not create release.');
    return Promise.resolve("nothing to do here");
  } else if (options.org === undefined) {
    ctx.logger.warn('Missing "org" option. Will not create release.');
    return Promise.resolve("nothing to do here");
  } else if (options.url === undefined) {
    ctx.logger.warn('Missing "url" option. Will not create release.');
    return Promise.resolve("nothing to do here");
  } else if (options.project === undefined) {
    ctx.logger.warn('Missing "project" option. Will not create release.');
    return Promise.resolve("nothing to do here");
  }

  await createRelease({
    release,
    authToken: options.authToken,
    org: options.org,
    project: options.project,
    sentryUrl: options.url,
    sentryHub: ctx.hub,
  });

  ctx.logger.info("Successfully created release.");

  span?.finish();
  return Promise.resolve("nothing to do here");
}

export async function uploadSourceMaps(
  release: string,
  options: Options,
  ctx: BuildContext
): Promise<string> {
  const span = addSpanToTransaction(ctx, "upload-sourceMaps");
  // This is what Sentry CLI does:
  //  TODO: 0. Preprocess source maps
  //           - (Out of scope for now)
  //           - For rewriting source maps see https://github.com/getsentry/rust-sourcemap/blob/master/src/types.rs#L763
  //  TODO: 1. Creates a new release to make sure it exists
  //           - can we assume that the release will exist b/c we don't give unplugin users the
  //           option to skip this step?
  //  TODO: 2. download already uploaded files and get their checksums
  //  TODO: 3. identify new or changed files (by comparing checksums)
  //  TODO: 4. upload new and changed files
  //           - CLI asks API for chunk options https://github.com/getsentry/sentry-cli/blob/7b8466885d9cfd51aee6fdc041eca9f645026303/src/utils/file_upload.rs#L106-L112
  //           - WTF?
  //           - don't upload more than 20k files
  //           - upload files concurrently
  //           - 2 options: chunked upload (multiple files per chunk) or single file upload
  const {
    include,
    ext,
    // ignore,
    // ignoreFile,
    // rewrite,
    // sourceMapReference,
    // stripPrefix,
    // stripCommonPrefix,
    // validate,
    // urlPrefix,
    // urlSuffix,
    org,
    project,
    authToken,
    url,
  } = options;

  // TODO: pull these checks out of here and simplify them
  if (authToken === undefined) {
    ctx.logger.warn('Missing "authToken" option. Will not create release.');
    return Promise.resolve("nothing to do here");
  } else if (org === undefined) {
    ctx.logger.warn('Missing "org" option. Will not create release.');
    return Promise.resolve("nothing to do here");
  } else if (url === undefined) {
    ctx.logger.warn('Missing "url" option. Will not create release.');
    return Promise.resolve("nothing to do here");
  } else if (project === undefined) {
    ctx.logger.warn('Missing "project" option. Will not create release.');
    return Promise.resolve("nothing to do here");
  }

  ctx.logger.info("Uploading Sourcemaps.");

  //TODO: Remove this once we have internal options. this property must always be present
  const fileExtensions = ext || [];
  const files = getFiles(include, fileExtensions);

  ctx.logger.info(`Found ${files.length} files to upload.`);

  return Promise.all(
    files.map((file) =>
      uploadReleaseFile({
        org,
        project,
        release,
        authToken,
        sentryUrl: url,
        filename: file.name,
        fileContent: file.content,
        sentryHub: ctx.hub,
      })
    )
  ).then(() => {
    ctx.logger.info("Successfully uploaded sourcemaps.");
    span?.finish();
    return "done";
  });
}

export async function finalizeRelease(
  release: string,
  options: Options,
  ctx: BuildContext
): Promise<string> {
  const span = addSpanToTransaction(ctx, "finalize-release");

  if (options.finalize) {
    const { authToken, org, url, project } = options;
    if (!authToken || !org || !url || !project) {
      ctx.logger.warn("Missing required option. Will not clean existing artifacts.");
      return Promise.resolve("nothing to do here");
    }

    await updateRelease({
      authToken,
      org,
      release,
      sentryUrl: url,
      project,
      sentryHub: ctx.hub,
    });

    ctx.logger.info("Successfully finalized release.");
  }

  span?.finish();
  return Promise.resolve("nothing to do here");
}

export async function cleanArtifacts(
  release: string,
  options: Options,
  ctx: BuildContext
): Promise<string> {
  const span = addSpanToTransaction(ctx, "clean-artifacts");

  if (options.cleanArtifacts) {
    // TODO: pull these checks out of here and simplify them
    if (options.authToken === undefined) {
      ctx.logger.warn('Missing "authToken" option. Will not clean existing artifacts.');
      return Promise.resolve("nothing to do here");
    } else if (options.org === undefined) {
      ctx.logger.warn('Missing "org" option. Will not clean existing artifacts.');
      return Promise.resolve("nothing to do here");
    } else if (options.url === undefined) {
      ctx.logger.warn('Missing "url" option. Will not clean existing artifacts.');
      return Promise.resolve("nothing to do here");
    } else if (options.project === undefined) {
      ctx.logger.warn('Missing "project" option. Will not clean existing artifacts.');
      return Promise.resolve("nothing to do here");
    }

    await deleteAllReleaseArtifacts({
      authToken: options.authToken,
      org: options.org,
      release,
      sentryUrl: options.url,
      project: options.project,
      sentryHub: ctx.hub,
    });

    ctx.logger.info("Successfully cleaned previous artifacts.");
  }

  span?.finish();
  return Promise.resolve("nothing to do here");
}

// TODO: Stuff we worry about later:

export async function setCommits(
  /* version: string, */
  ctx: BuildContext
): Promise<string> {
  const span = addSpanToTransaction(ctx, "set-commits");

  span?.finish();
  return Promise.resolve("Noop");
}

export async function addDeploy(
  /* version: string, */
  ctx: BuildContext
): Promise<string> {
  const span = addSpanToTransaction(ctx, "add-deploy");

  span?.finish();
  return Promise.resolve("Noop");
}
