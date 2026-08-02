import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export default function usePartyPresets(addToast) {
  const [presets, setPresets] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);

  const loadPresets = useCallback(async () => {
    const [charData, presetData] = await Promise.all([
      api.partyList(), api.partyPresets()
    ]);
    setCharacters(charData.characters);
    setPresets(presetData.presets);
    return { characters: charData.characters, presets: presetData.presets };
  }, []);

  const getCharByInvId = useCallback(
    (invId) => characters.find(c => c.inventory_id === invId),
    [characters]
  );

  const handlePresetSave = useCallback(async (name, ids) => {
    try {
      await api.savePartyPreset(editingSlot, name, ids);
      addToast('편성 저장 완료');
      setEditingSlot(null);
      const presetData = await api.partyPresets();
      setPresets(presetData.presets);
      const updated = presetData.presets.find(p => p.slot === editingSlot);
      if (updated && updated.partyIds.length > 0) setSelectedPreset(updated);
    } catch (err) { addToast(err.message, 'error'); }
  }, [editingSlot, addToast]);

  return {
    presets, characters, selectedPreset, setSelectedPreset,
    editingSlot, setEditingSlot,
    loadPresets, getCharByInvId, handlePresetSave,
  };
}
