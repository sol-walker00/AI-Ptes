import { useRef, useState } from 'react';
import { FileInput, PenLine } from 'lucide-react';
import { createAppDataFromPetAdoption, parsePetAdoptionText, type AdoptedAppData } from '../../domain/petAdoption';

interface AdoptionImportPanelProps {
  onImport: (data: AdoptedAppData) => Promise<void> | void;
  onCreateLocally: () => void;
}

export function AdoptionImportPanel({ onImport, onCreateLocally }: AdoptionImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function importFile(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setMessage('');

    try {
      const adoption = parsePetAdoptionText(await file.text());
      const data = createAppDataFromPetAdoption(adoption);
      await onImport(data);
      setMessage(`${data.profile.name} 已准备回家。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <section className="adoption-import-panel">
      <div className="adoption-import-copy">
        <h1>把你领养的宠物带回桌面</h1>
        <p>选择从领养站下载的 adoption.pet，或者直接在本机创建一只新宠物。</p>
      </div>
      <div className="adoption-import-actions">
        <label className="primary-button file-button">
          <FileInput size={18} />
          导入领养档案
          <input
            ref={inputRef}
            aria-label="选择领养档案"
            accept=".pet,application/json"
            disabled={busy}
            type="file"
            onChange={(event) => void importFile(event.currentTarget.files?.[0])}
          />
        </label>
        <button className="secondary-button icon-text-button" type="button" onClick={onCreateLocally}>
          <PenLine size={18} />
          本地创建新宠物
        </button>
      </div>
      <p className="adoption-import-hint">还没有档案时，先去领养网站设计并下载 adoption.pet。</p>
      {message && <p className="save-message" role="status">{message}</p>}
    </section>
  );
}
