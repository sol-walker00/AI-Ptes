import { useState } from 'react';
import { Download, MonitorDown } from 'lucide-react';
import {
  avatarAccessories,
  avatarAccentPalette,
  avatarBodies,
  avatarCheeks,
  avatarEyes,
  avatarMouths,
  avatarPalette,
  defaultPetAvatar,
} from '@desktop-pet/domain/petAvatar';
import type { PetAvatar, PetPersonaId } from '@desktop-pet/domain/petTypes';
import { CartoonAvatar } from '@desktop-pet/ui/components/CartoonAvatar';
import { createAdoptionDocument, downloadAdoptionDocument } from './adoption';
import { desktopDownloads, releaseVersion } from './downloads';

const personas: Array<{ id: PetPersonaId; label: string; text: string }> = [
  { id: 'healing', label: '治愈', text: '温柔陪伴，先接住情绪。' },
  { id: 'tsundere', label: '嘴硬', text: '别扭关心，但不会伤人。' },
  { id: 'studyBuddy', label: '学习搭子', text: '帮你拆任务、陪你专注。' },
  { id: 'energetic', label: '元气', text: '明亮积极，适合行动派。' },
];

const colorNames: Record<string, string> = {
  '#f6c65b': '蜂蜜黄',
  '#9fd7ff': '天空蓝',
  '#f7a8c7': '樱花粉',
  '#9fd8b5': '薄荷绿',
  '#bba7ff': '葡萄紫',
  '#f29f7f': '奶橘',
  '#fff1bf': '奶油黄',
  '#e4f5ff': '冰蓝',
  '#ffe3ef': '淡粉',
  '#e5f8ed': '浅绿',
  '#eee8ff': '浅紫',
  '#ffe4d8': '浅橘',
};

export function SiteApp() {
  const [name, setName] = useState('桃桃');
  const [species, setSpecies] = useState('桌面小猫');
  const [personaId, setPersonaId] = useState<PetPersonaId>('healing');
  const [avatar, setAvatar] = useState<PetAvatar>(() => defaultPetAvatar());
  const [message, setMessage] = useState('');
  const canAdopt = name.trim().length > 0 && species.trim().length > 0;
  const hasPendingDownloads = desktopDownloads.some((download) => !download.url);

  function updateAvatar(patch: Partial<PetAvatar>) {
    setAvatar((current) => ({ ...current, ...patch }));
  }

  function adopt() {
    if (!canAdopt) {
      return;
    }

    try {
      const document = createAdoptionDocument({ name, species, personaId, avatar });
      downloadAdoptionDocument(document);
      setMessage(`${document.profile.name} 的领养档案已下载。`);
    } catch {
      setMessage('下载失败，请重试。');
    }
  }

  return (
    <main className="adoption-page">
      <section className="adoption-workspace" aria-labelledby="site-heading">
        <div className="pet-preview-stage">
          <CartoonAvatar avatar={avatar} className="site-avatar" />
          <div className="preview-caption">
            <strong>{name.trim() || '未命名'}</strong>
            <span>{species.trim() || '等待填写形象'}</span>
          </div>
        </div>

        <div className="adoption-editor">
          <header className="editor-header">
            <h1 id="site-heading">创建你的桌面宠物</h1>
            <p>设计完成后下载 adoption.pet，再把它导入桌面客户端。</p>
          </header>

          <div className="field-grid">
            <label className="text-field">
              <span>宠物名字</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="text-field">
              <span>宠物形象</span>
              <input value={species} onChange={(event) => setSpecies(event.target.value)} />
            </label>
          </div>

          <OptionGroup label="性格" options={personas} selected={personaId} onSelect={setPersonaId} />
          <OptionGroup label="体型" options={avatarBodies} selected={avatar.body} onSelect={(body) => updateAvatar({ body })} />
          <SwatchGroup
            label="主色"
            colors={avatarPalette}
            selected={avatar.primaryColor}
            onSelect={(primaryColor) => updateAvatar({ primaryColor })}
          />
          <SwatchGroup
            label="辅色"
            colors={avatarAccentPalette}
            selected={avatar.secondaryColor}
            onSelect={(secondaryColor) => updateAvatar({ secondaryColor })}
          />
          <OptionGroup
            label="眼睛"
            options={avatarEyes}
            selected={avatar.eyeStyle}
            onSelect={(eyeStyle) => updateAvatar({ eyeStyle })}
          />
          <OptionGroup
            label="嘴巴"
            options={avatarMouths}
            selected={avatar.mouthStyle}
            onSelect={(mouthStyle) => updateAvatar({ mouthStyle })}
          />
          <OptionGroup
            label="脸颊"
            options={avatarCheeks}
            selected={avatar.cheekStyle}
            onSelect={(cheekStyle) => updateAvatar({ cheekStyle })}
          />
          <OptionGroup
            label="配饰"
            options={avatarAccessories}
            selected={avatar.accessory}
            onSelect={(accessory) => updateAvatar({ accessory })}
          />

          <div className="adoption-actions">
            <button className="primary-action" type="button" onClick={adopt} disabled={!canAdopt}>
              <Download size={18} aria-hidden="true" />
              下载领养档案
            </button>
            {message && <p role="status">{message}</p>}
          </div>
        </div>
      </section>

      <section className="download-band" aria-labelledby="download-heading">
        <div className="download-copy">
          <h2 id="download-heading">下载桌面客户端</h2>
          <p>当前版本 {releaseVersion}</p>
        </div>
        <div className="download-buttons">
          {desktopDownloads.map((download) => (
            download.url ? (
              <a className="download-button" href={download.url} key={download.platform}>
                <MonitorDown size={18} aria-hidden="true" />
                {download.label}
              </a>
            ) : (
              <button className="download-button" type="button" key={download.platform} disabled>
                <MonitorDown size={18} aria-hidden="true" />
                {download.label}
              </button>
            )
          ))}
        </div>
        {hasPendingDownloads && <span className="download-note">客户端安装包即将开放</span>}
      </section>
    </main>
  );
}

function OptionGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ id: T; label: string; text?: string }>;
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="option-group">
      <span className="option-label">{label}</span>
      <div className="segmented">
        {options.map((option) => (
          <button
            aria-label={`${label} ${option.label}`}
            aria-pressed={selected === option.id}
            key={option.id}
            type="button"
            title={option.text}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SwatchGroup({
  label,
  colors,
  selected,
  onSelect,
}: {
  label: string;
  colors: string[];
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <div className="option-group">
      <span className="option-label">{label}</span>
      <div className="swatches">
        {colors.map((color) => (
          <button
            aria-label={`${label} ${colorNames[color]}`}
            aria-pressed={selected === color}
            key={color}
            style={{ background: color }}
            type="button"
            onClick={() => onSelect(color)}
          />
        ))}
      </div>
    </div>
  );
}
