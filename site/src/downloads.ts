export interface DesktopDownload {
  platform: 'macos' | 'windows';
  label: string;
  url: string;
}

export const releaseVersion = '0.1.0';

export const desktopDownloads: DesktopDownload[] = [
  {
    platform: 'macos',
    label: 'macOS',
    url: '',
  },
  {
    platform: 'windows',
    label: 'Windows',
    url: '',
  },
];
