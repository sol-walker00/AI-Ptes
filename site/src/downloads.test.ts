import { describe, expect, it } from 'vitest';
import { buildDesktopDownloads, releaseVersion } from './downloads';

describe('desktop download configuration', () => {
  it('builds direct macOS and Windows release URLs from a shared base URL', () => {
    const downloads = buildDesktopDownloads({
      baseUrl: 'https://downloads.example.com/desktop-ai-pet-v0.1.0/',
    });

    expect(downloads).toEqual([
      {
        platform: 'macos',
        label: '下载 macOS 版',
        url: `https://downloads.example.com/desktop-ai-pet-v0.1.0/Desktop-AI-Pet-${releaseVersion}-macos-aarch64.zip`,
      },
      {
        platform: 'windows',
        label: '下载 Windows 版',
        url: `https://downloads.example.com/desktop-ai-pet-v0.1.0/Desktop-AI-Pet-${releaseVersion}-windows-x64.zip`,
      },
    ]);
  });

  it('uses bundled local desktop downloads when no release base URL is configured', () => {
    const downloads = buildDesktopDownloads();

    expect(downloads.find((download) => download.platform === 'macos')?.url).toBe(
      `/downloads/Desktop-AI-Pet-${releaseVersion}-macos-aarch64.zip`,
    );
    expect(downloads.find((download) => download.platform === 'windows')?.url).toBe(
      `/downloads/Desktop-AI-Pet-${releaseVersion}-windows-x64.zip`,
    );
  });
});
