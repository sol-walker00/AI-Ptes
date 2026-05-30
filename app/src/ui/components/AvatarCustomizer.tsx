import {
  avatarAccessories,
  avatarAccentPalette,
  avatarBodies,
  avatarCheeks,
  avatarEyes,
  avatarMouths,
  avatarPalette,
} from '../../domain/petAvatar';
import type { PetAvatar } from '../../domain/petTypes';
import { CartoonAvatar } from './CartoonAvatar';

interface AvatarCustomizerProps {
  avatar: PetAvatar;
  onChange: (avatar: PetAvatar) => void;
}

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

export function AvatarCustomizer({ avatar, onChange }: AvatarCustomizerProps) {
  const update = (patch: Partial<PetAvatar>) => onChange({ ...avatar, ...patch });

  return (
    <section className="settings-section avatar-customizer">
      <h2>形象装扮</h2>
      <div className="avatar-dress-up">
        <div className="avatar-preview">
          <CartoonAvatar avatar={avatar} className="avatar-preview-sprite" />
        </div>
        <div className="avatar-controls">
          <OptionGroup
            label="体型"
            options={avatarBodies}
            selected={avatar.body}
            onSelect={(body) => update({ body })}
          />
          <SwatchGroup
            label="主色"
            colors={avatarPalette}
            selected={avatar.primaryColor}
            onSelect={(primaryColor) => update({ primaryColor })}
          />
          <SwatchGroup
            label="辅色"
            colors={avatarAccentPalette}
            selected={avatar.secondaryColor}
            onSelect={(secondaryColor) => update({ secondaryColor })}
          />
          <OptionGroup
            label="眼睛"
            options={avatarEyes}
            selected={avatar.eyeStyle}
            onSelect={(eyeStyle) => update({ eyeStyle })}
          />
          <OptionGroup
            label="嘴巴"
            options={avatarMouths}
            selected={avatar.mouthStyle}
            onSelect={(mouthStyle) => update({ mouthStyle })}
          />
          <OptionGroup
            label="脸颊"
            options={avatarCheeks}
            selected={avatar.cheekStyle}
            onSelect={(cheekStyle) => update({ cheekStyle })}
          />
          <OptionGroup
            label="配饰"
            options={avatarAccessories}
            selected={avatar.accessory}
            onSelect={(accessory) => update({ accessory })}
          />
        </div>
      </div>
    </section>
  );
}

function OptionGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="avatar-option-group">
      <span>{label}</span>
      <div className="avatar-segmented">
        {options.map((option) => (
          <button
            aria-pressed={selected === option.id}
            className="avatar-option"
            key={option.id}
            onClick={() => onSelect(option.id)}
            type="button"
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
    <div className="avatar-option-group">
      <span>{label}</span>
      <div className="avatar-swatches">
        {colors.map((color) => (
          <button
            aria-label={`${label} ${colorNames[color]}`}
            aria-pressed={selected === color}
            className="avatar-swatch"
            key={color}
            onClick={() => onSelect(color)}
            style={{ background: color }}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
