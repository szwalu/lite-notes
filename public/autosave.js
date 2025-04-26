
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form[action="/save"]');
  const titleInput = form.querySelector('input[name="title"]');
  const contentInput = form.querySelector('textarea[name="content"]');

  let timeout;
  function autoSave() {
    if (!titleInput.value && !contentInput.value) return;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const formData = new FormData(form);
      fetch('/save', {
        method: 'POST',
        body: formData
      }).then(() => {
        console.log("自动保存成功");
      }).catch(err => {
        console.error("自动保存失败", err);
      });
    }, 2000);
  }

  titleInput.addEventListener('input', autoSave);
  contentInput.addEventListener('input', autoSave);
});
