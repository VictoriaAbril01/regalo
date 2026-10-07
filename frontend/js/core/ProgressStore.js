const STORAGE_KEY = 'para-ti-stage-v1';

export function readStage(totalStages) {
  try {
    const value = Number(sessionStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value >= 0 && value < totalStages ? value : 0;
  } catch { return 0; }
}

export function saveStage(stage) {
  try { sessionStorage.setItem(STORAGE_KEY, String(stage)); } catch { /* private mode */ }
}

export function resetStage() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
}
