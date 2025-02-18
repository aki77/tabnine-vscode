import { promises as fs } from "fs";
import * as path from "path";
import * as extract from "extract-zip";
import {
  downloadFileToDestination,
  downloadFileToStr,
} from "../../download.utils";
import {
  getBundlePath,
  getDownloadVersionUrl,
  getUpdateVersionFileUrl,
  isWindows,
  versionPath,
} from "../paths";
import { EventName, report } from "../../reporter";

const EXECUTABLE_FLAG = 0o755;

type BundlePaths = {
  bundlePath: string;
  bundleDownloadUrl: string;
  bundleDirectory: string;
  executablePath: string;
};

export default async function downloadAndExtractBundle(): Promise<string> {
  const {
    bundlePath,
    bundleDownloadUrl,
    bundleDirectory,
    executablePath,
  } = await getBundlePaths();
  try {
    await createBundleDirectory(bundleDirectory);
    await downloadFileToDestination(bundleDownloadUrl, bundlePath);
    await extractBundle(bundlePath, bundleDirectory);
    await removeBundle(bundlePath);
    await setDirectoryFilesAsExecutable(bundleDirectory);
    report(EventName.BUNDLE_DOWNLOAD_SUCCESS);
    return executablePath;
  } finally {
    await removeBundle(bundlePath);
  }
}

async function removeBundle(bundlePath: string) {
  try {
    await fs.unlink(bundlePath);
    // eslint-disable-next-line no-empty
  } catch {}
}

async function getBundlePaths(): Promise<BundlePaths> {
  const version = await getCurrentVersion();
  const bundlePath = getBundlePath(version);
  const bundleDownloadUrl = getDownloadVersionUrl(version);
  const bundleDirectory = path.dirname(bundlePath);
  const executablePath = versionPath(version);
  return { bundlePath, bundleDownloadUrl, bundleDirectory, executablePath };
}

function createBundleDirectory(bundleDirectory: string): Promise<void> {
  return fs.mkdir(bundleDirectory, { recursive: true });
}

async function getCurrentVersion(): Promise<string> {
  const versionUrl = getUpdateVersionFileUrl();
  return downloadFileToStr(versionUrl);
}

async function extractBundle(
  bundle: string,
  bundleDirectory: string
): Promise<void> {
  return extract(bundle, { dir: bundleDirectory });
}

async function setDirectoryFilesAsExecutable(
  bundleDirectory: string
): Promise<void[]> {
  if (isWindows()) {
    return Promise.resolve([]);
  }
  const files = await fs.readdir(bundleDirectory);
  return Promise.all(
    files.map((file) =>
      fs.chmod(path.join(bundleDirectory, file), EXECUTABLE_FLAG)
    )
  );
}
