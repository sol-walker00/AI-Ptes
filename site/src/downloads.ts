export interface DesktopDownload {
  platform: 'macos' | 'windows';
  label: string;
  url: string;
}

export const releaseVersion = '0.1.0';

export const desktopDownloads: DesktopDownload[] = [
  {
    platform: 'macos',
    label: '下载 macOS 版',
    url: '',
  },
  {
    platform: 'windows',
    label: '下载 Windows 版',
    url: '',
  },
];
