import { normalizePetAvatar } from '../../domain/petAvatar';
import type { PetAvatar } from '../../domain/petTypes';

interface CartoonAvatarProps {
  avatar: PetAvatar;
  className?: string;
}

export function CartoonAvatar({ avatar, className }: CartoonAvatarProps) {
  const normalized = normalizePetAvatar(avatar);

  return (
    <svg
      aria-label="custom pet avatar"
      className={className}
      data-avatar-accessory={normalized.accessory}
      data-avatar-body={normalized.body}
      role="img"
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g data-layer="body-shape" fill={normalized.primaryColor}>
        {normalized.body === 'cat' && <CatBody />}
        {normalized.body === 'bear' && <BearBody />}
        {normalized.body === 'bunny' && <BunnyBody />}
        {normalized.body === 'blob' && <BlobBody />}
      </g>
      <ellipse data-layer="body" cx="64" cy="68" rx="42" ry="38" fill={normalized.primaryColor} />
      <ellipse data-layer="belly" cx="64" cy="78" rx="26" ry="22" fill={normalized.secondaryColor} opacity="0.92" />
      <Eyes style={normalized.eyeStyle} />
      <Mouth style={normalized.mouthStyle} />
      <Cheeks style={normalized.cheekStyle} />
      <Accessory accessory={normalized.accessory} />
    </svg>
  );
}

function CatBody() {
  return (
    <>
      <path d="M33 41 40 17 57 37Z" />
      <path d="M95 41 88 17 71 37Z" />
    </>
  );
}

function BearBody() {
  return (
    <>
      <circle cx="36" cy="38" r="16" />
      <circle cx="92" cy="38" r="16" />
    </>
  );
}

function BunnyBody() {
  return (
    <>
      <ellipse cx="46" cy="29" rx="12" ry="27" transform="rotate(-14 46 29)" />
      <ellipse cx="82" cy="29" rx="12" ry="27" transform="rotate(14 82 29)" />
    </>
  );
}

function BlobBody() {
  return <path d="M27 62C27 34 49 22 68 27c20 5 35 18 34 42-1 27-19 42-42 40-22-1-33-18-33-47Z" />;
}

function Eyes({ style }: { style: PetAvatar['eyeStyle'] }) {
  if (style === 'sleepy') {
    return (
      <g data-layer="eyes" data-eye-style={style} fill="none" stroke="#17201b" strokeLinecap="round" strokeWidth="4">
        <path d="M45 62q8 7 16 0" />
        <path d="M67 62q8 7 16 0" />
      </g>
    );
  }

  if (style === 'sparkle') {
    return (
      <g data-layer="eyes" data-eye-style={style} fill="#17201b">
        <path d="M51 51 55 59 63 63 55 67 51 75 47 67 39 63 47 59Z" />
        <path d="M77 51 81 59 89 63 81 67 77 75 73 67 65 63 73 59Z" />
      </g>
    );
  }

  return (
    <g data-layer="eyes" data-eye-style={style} fill="#17201b">
      <circle cx="52" cy="62" r="5" />
      <circle cx="76" cy="62" r="5" />
    </g>
  );
}

function Mouth({ style }: { style: PetAvatar['mouthStyle'] }) {
  if (style === 'smile') {
    return (
      <path
        d="M52 76q12 12 24 0"
        data-layer="mouth"
        data-mouth-style={style}
        fill="none"
        stroke="#17201b"
        strokeLinecap="round"
        strokeWidth="4"
      />
    );
  }

  if (style === 'shy') {
    return (
      <g data-layer="mouth" data-mouth-style={style} fill="#17201b">
        <ellipse cx="64" cy="78" rx="6" ry="3" />
      </g>
    );
  }

  return (
    <g data-layer="mouth" data-mouth-style={style} fill="none" stroke="#17201b" strokeLinecap="round" strokeWidth="3">
      <path d="M64 72v5" />
      <path d="M64 77q-7 9-14 0" />
      <path d="M64 77q7 9 14 0" />
    </g>
  );
}

function Cheeks({ style }: { style: PetAvatar['cheekStyle'] }) {
  const fill = style === 'peach' ? '#ffba91' : '#ff9db5';
  return (
    <g data-layer="cheeks" data-cheek-style={style} fill={fill} opacity={style === 'none' ? 0 : 0.68}>
      <ellipse cx="40" cy="76" rx="8" ry="5" />
      <ellipse cx="88" cy="76" rx="8" ry="5" />
    </g>
  );
}

function Accessory({ accessory }: { accessory: PetAvatar['accessory'] }) {
  if (accessory === 'bow') {
    return (
      <g data-layer="accessory" data-accessory={accessory}>
        <circle cx="64" cy="30" r="5" fill="#e84d7a" />
        <path d="M60 30 43 21v18Z" fill="#ff7aa2" />
        <path d="M68 30 85 21v18Z" fill="#ff7aa2" />
      </g>
    );
  }

  if (accessory === 'cap') {
    return (
      <g data-layer="accessory" data-accessory={accessory} fill="#3f6f9f">
        <path d="M39 39c5-18 45-18 50 0Z" />
        <path d="M82 39h24q-7 9-25 8Z" />
      </g>
    );
  }

  if (accessory === 'headphones') {
    return (
      <g data-layer="accessory" data-accessory={accessory} fill="none" stroke="#34424a" strokeLinecap="round" strokeWidth="6">
        <path d="M34 65c0-25 60-25 60 0" />
        <path d="M33 66v15" />
        <path d="M95 66v15" />
      </g>
    );
  }

  if (accessory === 'scarf') {
    return (
      <g data-layer="accessory" data-accessory={accessory} fill="#dc6b4a">
        <path d="M36 92q28 15 56 0v11q-28 13-56 0Z" />
        <path d="M71 96h18l-7 23-13-6Z" />
      </g>
    );
  }

  return <g data-layer="accessory" data-accessory={accessory} />;
}
