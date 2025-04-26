// public/autosave.js

let autosaveTimer;
const AUTOSAVE_INTERVAL = 5000; // 5秒后自动保存

function saveNote(manual = false) {
  const content = document.getElementById('content').value;
  fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
  .then(response => {
    if (response.ok) {
      if (manual) {
        alert('✅ 笔记已手动保存成功！');
      }
    } else {
      alert('❌ 保存失败，请稍后再试');
    }
  })
  .catch(error => {
    console.error('保存出错:', error);
    alert('❌ 保存出错');
  });
}

document.getElementById('content').addEventListener('input', () => {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveNote();
  }, AUTOSAVE_INTERVAL);
});
