export interface DesktopDownload {
  platform: 'macos' | 'windows';
  label: string;
  url: string;
}

export const releaseVersion = '0.1.0';

export const desktopDownloadFiles = {
  macos: `Desktop-AI-Pet-${releaseVersion}-macos-aarch64.zip`,
  windows: `Desktop-AI-Pet-${releaseVersion}-windows-x64.zip`,
} as const;

interface DesktopDownloadOptions {
  baseUrl?: string;
  localBaseUrl?: string;
}

function joinDownloadUrl(baseUrl: string, fileName: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${fileName}`;
}

export function buildDesktopDownloads(options: DesktopDownloadOptions = {}): DesktopDownload[] {
  const baseUrl = options.baseUrl?.trim();
  const localDownloadsBaseUrl = joinDownloadUrl(options.localBaseUrl?.trim() || '/', 'downloads');

  return [
    {
      platform: 'macos',
      label: '下载 macOS 版',
      url: baseUrl
        ? joinDownloadUrl(baseUrl, desktopDownloadFiles.macos)
        : joinDownloadUrl(localDownloadsBaseUrl, desktopDownloadFiles.macos),
    },
    {
      platform: 'windows',
      label: '下载 Windows 版',
      url: baseUrl
        ? joinDownloadUrl(baseUrl, desktopDownloadFiles.windows)
        : joinDownloadUrl(localDownloadsBaseUrl, desktopDownloadFiles.windows),
    },
  ];
}

const desktopDownloadBaseUrl = import.meta.env.VITE_DESKTOP_DOWNLOAD_BASE_URL;

export const desktopDownloads = buildDesktopDownloads({
  baseUrl: typeof desktopDownloadBaseUrl === 'string' ? desktopDownloadBaseUrl : undefined,
  localBaseUrl: import.meta.env.BASE_URL,
});
